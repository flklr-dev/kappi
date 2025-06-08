import os
import cv2
import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import shutil
from tqdm import tqdm

# Configuration
INPUT_SIZE = (224, 224)  # Standard input size for many CNNs
PROCESSED_DIR = 'processed'

# Create directories for processed images
def create_processed_dirs(base_path):
    categories = ['Healthy/leaf', 'CoffeeLeafRust/leaf_early', 
                 'CoffeeLeafRust/leaf_progressive', 'CoffeeLeafRust/leaf_severe']
    
    for category in categories:
        os.makedirs(os.path.join(base_path, PROCESSED_DIR, category), exist_ok=True)

# Image preprocessing function
def preprocess_image(image_path, target_size=INPUT_SIZE):
    # Read image with PIL
    img = Image.open(image_path)
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize
    img = img.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(img)
    
    # Normalize pixel values to [0,1]
    img_array = img_array.astype('float32') / 255.0
    
    return img_array, img

# Augmentation function using OpenCV
def apply_opencv_augmentation(img):
    augmented_images = []
    
    # Original image
    augmented_images.append(img)
    
    # Brightness variation
    brightness = np.ones(img.shape, dtype="uint8") * 30
    brightened = cv2.add(img, brightness)
    augmented_images.append(brightened)
    
    darkened = cv2.subtract(img, brightness)
    augmented_images.append(darkened)
    
    # Gaussian blur
    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    augmented_images.append(blurred)
    
    return augmented_images

def main():
    base_path = 'data'
    categories = ['Healthy/leaf', 'CoffeeLeafRust/leaf_early', 
                 'CoffeeLeafRust/leaf_progressive', 'CoffeeLeafRust/leaf_severe']
    
    # Create processed directories
    create_processed_dirs(base_path)
    
    # Set up ImageDataGenerator for additional augmentation
    datagen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        vertical_flip=False,
        fill_mode='nearest'
    )
    
    # Process each category
    for category in categories:
        category_path = os.path.join(base_path, category)
        processed_category_path = os.path.join(base_path, PROCESSED_DIR, category)
        
        # Get all images in category
        images = [f for f in os.listdir(category_path) 
                 if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        print(f"\nProcessing {category}...")
        for img_name in tqdm(images):
            img_path = os.path.join(category_path, img_name)
            
            # Basic preprocessing
            img_array, pil_img = preprocess_image(img_path)
            
            # Save preprocessed original
            base_name = os.path.splitext(img_name)[0]
            pil_img.save(os.path.join(processed_category_path, f"{base_name}_proc.jpg"))
            
            # OpenCV augmentations
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            aug_images = apply_opencv_augmentation(cv_img)
            
            # Save OpenCV augmented images
            for i, aug_img in enumerate(aug_images):
                cv2.imwrite(os.path.join(processed_category_path, 
                                       f"{base_name}_aug{i}.jpg"), aug_img)
            
            # Keras augmentation
            img_array = img_array.reshape((1,) + img_array.shape)
            i = 0
            for batch in datagen.flow(img_array, batch_size=1):
                aug_img = Image.fromarray((batch[0] * 255).astype('uint8'))
                aug_img.save(os.path.join(processed_category_path, 
                                        f"{base_name}_keras_aug{i}.jpg"))
                i += 1
                if i >= 3:  # Generate 3 augmented images per original
                    break

if __name__ == "__main__":
    main() 