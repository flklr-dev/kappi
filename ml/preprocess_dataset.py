import os
import cv2
import numpy as np
from PIL import Image
import random
import shutil
from tqdm import tqdm

# Constants
INPUT_SIZE = (224, 224)
MIN_IMAGE_SIZE = 1024
# No target limit - we'll create comprehensive augmented dataset

def create_processed_dirs(base_path):
    """Create processed directories for train and validation sets."""
    processed_dir = os.path.join(base_path, 'processed')
    if os.path.exists(processed_dir):
        print(f"Cleaning existing processed directory: {processed_dir}")
        shutil.rmtree(processed_dir)
    os.makedirs(processed_dir)
    
    train_dir = os.path.join(processed_dir, 'train')
    val_dir = os.path.join(processed_dir, 'val')
    os.makedirs(train_dir)
    os.makedirs(val_dir)
    
    classes = ['Healthy', 'CLR_Early', 'CLR_Progressive', 'CLR_SEVERE']
    for class_name in classes:
        os.makedirs(os.path.join(train_dir, class_name))
        os.makedirs(os.path.join(val_dir, class_name))
    
    return train_dir, val_dir

def is_valid_image(image_path):
    """Check if image is valid and not corrupted."""
    try:
        img = Image.open(image_path)
        img.verify()
        return os.path.getsize(image_path) >= MIN_IMAGE_SIZE
    except Exception as e:
        print(f"Invalid image {image_path}: {str(e)}")
        return False

def preprocess_image(image_path, target_size=INPUT_SIZE):
    """Enhanced preprocessing for a single image."""
    try:
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_array = np.array(img)
        
        # Apply CLAHE
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        enhanced = cv2.merge((cl,a,b))
        img_array = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        
        # Resize image
        img_array = cv2.resize(img_array, target_size, interpolation=cv2.INTER_AREA)
        
        # Normalize pixel values
        img_array = img_array.astype(np.float32) / 255.0
        
        return img_array
    except Exception as e:
        print(f"Error preprocessing {image_path}: {e}")
        return None

def apply_augmentation(img, aug_type):
    """Apply comprehensive augmentation techniques for plant disease detection."""
    if img is None:
        return None
        
    try:
        # Convert to uint8 for OpenCV operations
        if img.dtype == np.float32:
            img = (img * 255).astype(np.uint8)
        
        if len(img.shape) == 2:  # Grayscale
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 3:  # RGB
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        h, w = img.shape[:2]
        angle = 0
        
        # Comprehensive augmentation techniques
        if aug_type == 'rotate_left':
            angle = random.uniform(-25, -10)
        elif aug_type == 'rotate_right':
            angle = random.uniform(10, 25)
        elif aug_type == 'rotate_small':
            angle = random.uniform(-8, 8)
            
        elif aug_type == 'brightness_up':
            alpha = random.uniform(1.2, 1.5)
            beta = random.uniform(10, 25)
            img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
        elif aug_type == 'brightness_down':
            alpha = random.uniform(0.6, 0.8)
            beta = random.uniform(-25, -10)
            img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
        elif aug_type == 'contrast_up':
            alpha = random.uniform(1.3, 1.7)
            img = cv2.convertScaleAbs(img, alpha=alpha, beta=0)
        elif aug_type == 'contrast_down':
            alpha = random.uniform(0.5, 0.7)
            img = cv2.convertScaleAbs(img, alpha=alpha, beta=0)
            
        elif aug_type == 'flip_horizontal':
            img = cv2.flip(img, 1)
        elif aug_type == 'flip_vertical':
            img = cv2.flip(img, 0)
            
        elif aug_type == 'gaussian_noise':
            noise = np.random.normal(0, random.uniform(10, 25), img.shape).astype(np.uint8)
            img = cv2.add(img, noise)
        elif aug_type == 'salt_pepper':
            # Salt and pepper noise
            s_vs_p = 0.5
            amount = random.uniform(0.01, 0.05)
            out = np.copy(img)
            # Salt mode
            num_salt = np.ceil(amount * img.size * s_vs_p)
            coords = tuple([np.random.randint(0, i - 1, int(num_salt))
                          for i in img.shape[:2]])
            out[coords] = 255
            # Pepper mode
            num_pepper = np.ceil(amount * img.size * (1. - s_vs_p))
            coords = tuple([np.random.randint(0, i - 1, int(num_pepper))
                          for i in img.shape[:2]])
            out[coords] = 0
            img = out
            
        elif aug_type == 'gaussian_blur':
            kernel_size = random.choice([3, 5, 7])
            img = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
        elif aug_type == 'motion_blur':
            # Motion blur
            size = random.randint(5, 15)
            kernel_motion_blur = np.zeros((size, size))
            kernel_motion_blur[int((size-1)/2), :] = np.ones(size)
            kernel_motion_blur = kernel_motion_blur / size
            img = cv2.filter2D(img, -1, kernel_motion_blur)
            
        elif aug_type == 'zoom_in':
            # Zoom in (crop and resize)
            crop_factor = random.uniform(0.8, 0.95)
            crop_h, crop_w = int(h * crop_factor), int(w * crop_factor)
            start_h = (h - crop_h) // 2
            start_w = (w - crop_w) // 2
            img = img[start_h:start_h+crop_h, start_w:start_w+crop_w]
            img = cv2.resize(img, (w, h))
        elif aug_type == 'zoom_out':
            # Zoom out (pad and resize)
            pad_factor = random.uniform(1.1, 1.3)
            new_h, new_w = int(h * pad_factor), int(w * pad_factor)
            img = cv2.resize(img, (new_w, new_h))
            start_h = (new_h - h) // 2
            start_w = (new_w - w) // 2
            img = img[start_h:start_h+h, start_w:start_w+w]
            
        elif aug_type == 'perspective':
            # Perspective transformation
            pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
            offset = random.uniform(10, 30)
            pts2 = np.float32([[offset, offset], [w-offset, offset], 
                              [0, h], [w, h-offset]])
            M = cv2.getPerspectiveTransform(pts1, pts2)
            img = cv2.warpPerspective(img, M, (w, h))
            
        elif aug_type == 'shear':
            # Shear transformation
            shear_range = random.uniform(-0.2, 0.2)
            M = np.array([[1, shear_range, 0], [0, 1, 0]], dtype=np.float32)
            img = cv2.warpAffine(img, M, (w, h))
            
        elif aug_type == 'hue_shift':
            # HSV color space manipulation
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            hsv[:, :, 0] = (hsv[:, :, 0] + random.uniform(-20, 20)) % 180
            img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        elif aug_type == 'saturation':
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            hsv[:, :, 1] = hsv[:, :, 1] * random.uniform(0.7, 1.4)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
            img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
            
        elif aug_type == 'elastic':
            # Elastic deformation (simplified)
            alpha = random.uniform(5, 15)
            sigma = random.uniform(2, 4)
            dx = cv2.GaussianBlur((np.random.rand(h, w) * 2 - 1), (0, 0), sigma) * alpha
            dy = cv2.GaussianBlur((np.random.rand(h, w) * 2 - 1), (0, 0), sigma) * alpha
            x, y = np.meshgrid(np.arange(w), np.arange(h))
            map_x = (x + dx).astype(np.float32)
            map_y = (y + dy).astype(np.float32)
            img = cv2.remap(img, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            
        elif aug_type == 'gamma_correction':
            # Gamma correction
            gamma = random.uniform(0.6, 1.6)
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255
                            for i in np.arange(0, 256)]).astype("uint8")
            img = cv2.LUT(img, table)
            
        elif aug_type == 'channel_shuffle':
            # Randomly shuffle color channels
            channels = [0, 1, 2]
            random.shuffle(channels)
            img = img[:, :, channels]
            
        elif aug_type == 'cutout':
            # Random cutout/occlusion
            cutout_size = random.randint(20, 60)
            x = random.randint(0, max(1, w - cutout_size))
            y = random.randint(0, max(1, h - cutout_size))
            img[y:y+cutout_size, x:x+cutout_size] = random.randint(0, 255)
            
        else:  # default rotation
            angle = random.uniform(-15, 15)
        
        # Apply rotation if specified
        if angle != 0:
            M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1)
            img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        
        # Convert back to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return img
    except Exception as e:
        print(f"Error in augmentation ({aug_type}): {e}")
        return None

def save_image(image, path):
    """Save image with validation."""
    try:
        if image is None:
            return False
            
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        if image.dtype == np.float32:
            image = (image * 255).astype(np.uint8)
        
        cv2.imwrite(path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        
        if os.path.exists(path) and os.path.getsize(path) >= MIN_IMAGE_SIZE:
            return True
        else:
            if os.path.exists(path):
                os.remove(path)
            return False
    except Exception as e:
        print(f"Error saving image to {path}: {e}")
        if os.path.exists(path):
            os.remove(path)
        return False

def main():
    """Main function with balanced augmentation."""
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data')
    raw_path = os.path.join(data_path, 'raw')
    
    print(f"Base path: {base_path}")
    print(f"Data path: {data_path}")
    print(f"Raw path:  {raw_path}")
    
    # Create processed directories
    train_dir, val_dir = create_processed_dirs(data_path)
    
    # Define class mappings
    class_mappings = {
        'Healthy': os.path.join(raw_path, 'leaf', 'healthy'),
        'CLR_Early': os.path.join(raw_path, 'leaf', 'coffee_leaf_rust', 'early'),
        'CLR_Progressive': os.path.join(raw_path, 'leaf', 'coffee_leaf_rust', 'progressive'),
        'CLR_SEVERE': os.path.join(raw_path, 'leaf', 'coffee_leaf_rust', 'severe')
    }
    
    # Comprehensive augmentation types for robust plant disease detection
    aug_types = [
        # Geometric transformations
        'rotate_left', 'rotate_right', 'rotate_small', 'flip_horizontal', 'flip_vertical',
        'zoom_in', 'zoom_out', 'perspective', 'shear', 'elastic',
        
        # Photometric transformations
        'brightness_up', 'brightness_down', 'contrast_up', 'contrast_down',
        'gamma_correction', 'hue_shift', 'saturation',
        
        # Noise and blur
        'gaussian_noise', 'salt_pepper', 'gaussian_blur', 'motion_blur',
        
        # Advanced techniques
        'channel_shuffle', 'cutout'
    ]
    
    # Process each class
    for class_name, source_path in class_mappings.items():
        print(f"\nProcessing {class_name}...")
        print(f"Source path: {source_path}")
        
        if not os.path.exists(source_path):
            print(f"Warning: Source path does not exist: {source_path}")
            continue
            
        # Get all valid images
        images = [f for f in os.listdir(source_path) 
                 if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        valid_images = []
        for img_name in images:
            img_path = os.path.join(source_path, img_name)
            if is_valid_image(img_path):
                valid_images.append(img_name)
        
        if not valid_images:
            print(f"Warning: No valid images found in {source_path}")
            continue
            
        print(f"Found {len(valid_images)} valid images")
        
        # Shuffle for randomness
        random.shuffle(valid_images)
        
        # Split into train/val (80/20)
        split_idx = int(len(valid_images) * 0.8)
        train_images = valid_images[:split_idx]
        val_images = valid_images[split_idx:]
        
        # Process training images with systematic comprehensive augmentation
        print(f"Processing {len(train_images)} training images...")
        print(f"Applying ALL {len(aug_types)} augmentation techniques systematically")
        print(f"This will create: {len(train_images)} original + ({len(train_images)} × {len(aug_types)}) augmented images")
        print(f"Expected total training images: {len(train_images) * (1 + len(aug_types))} per class")
        
        train_success = 0
        
        for i, img_name in enumerate(tqdm(train_images, desc=f"Processing {class_name}")):
            img_path = os.path.join(source_path, img_name)
            img = preprocess_image(img_path)
            
            if img is None:
                continue
            
            base = os.path.splitext(img_name)[0]
            
            # Save original processed image
            save_path = os.path.join(train_dir, class_name, f"{base}_proc.jpg")
            if save_image(img, save_path):
                train_success += 1
            
            # Apply ALL augmentation techniques systematically to each image
            # This ensures comprehensive coverage of all possible variations
            for aug_type in aug_types:
                aug_img = apply_augmentation(img, aug_type)
                
                if aug_img is not None:
                    aug_name = os.path.join(train_dir, class_name, f"{base}_aug_{aug_type}.jpg")
                    if save_image(aug_img, aug_name):
                        train_success += 1
        
        # Process validation images (no augmentation)
        print(f"Processing {len(val_images)} validation images...")
        val_success = 0
        
        for img_name in tqdm(val_images):
            img_path = os.path.join(source_path, img_name)
            if not is_valid_image(img_path):
                continue
                
            img = preprocess_image(img_path)
            if img is not None:
                base = os.path.splitext(img_name)[0]
                save_path = os.path.join(val_dir, class_name, f"{base}_proc.jpg")
                if save_image(img, save_path):
                    val_success += 1
        
        print(f"{class_name} - Train: {train_success}, Validation: {val_success}")

if __name__ == '__main__':
    main()