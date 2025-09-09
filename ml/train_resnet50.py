import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.resnet import ResNet50, preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization, Input
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.metrics import Precision, Recall
from tensorflow.keras.regularizers import l2
import matplotlib.pyplot as plt
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint, TensorBoard

CONFIG = {
    'img_size': (224, 224),
    'batch_size': 24,  # Optimized batch size for ResNet50
    'epochs': 150,
    'learning_rate': 0.001,
    'dropout_rate': 0.3,
    'data_dir': os.path.join(os.path.dirname(__file__), 'data', 'processed'),
    'model_export_path': 'model_export',
    'l2_lambda': 0.0001,
    'early_stopping_patience': 20,
    'early_stopping_min_delta': 0.0001,
    'reduce_lr_patience': 10,
    'reduce_lr_factor': 0.5,
    'min_lr': 1e-6,
    'label_smoothing': 0.1,
    'warmup_epochs': 5
}

def calculate_class_weights(generator):
    total_counts = generator.classes.shape[0]
    class_counts = np.bincount(generator.classes)
    class_weights = {i: total_counts / (len(class_counts) * count)
                    for i, count in enumerate(class_counts)}
    return class_weights

def create_data_generators():
    base_path = os.path.abspath(os.path.dirname(__file__))
    data_path = os.path.join(base_path, 'data', 'processed')
    print(f"\nLoading data from: {data_path}")
    if not os.path.exists(data_path):
        raise ValueError(f"Data directory not found: {data_path}")

    for split in ['train', 'val']:
        split_path = os.path.join(data_path, split)
        print(f"\n{split.upper()} set:")
        for category in os.listdir(split_path):
            category_path = os.path.join(split_path, category)
            if os.path.isdir(category_path):
                num_images = len([f for f in os.listdir(category_path)
                                if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                print(f"{category}: {num_images} images")

    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        brightness_range=[0.8, 1.2]
    )

    valid_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

    train_data = train_datagen.flow_from_directory(
        os.path.join(data_path, 'train'),
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        shuffle=True,
        seed=42
    )

    valid_data = valid_datagen.flow_from_directory(
        os.path.join(data_path, 'val'),
        target_size=CONFIG['img_size'],
        batch_size=CONFIG['batch_size'],
        class_mode='categorical',
        shuffle=False
    )

    return train_data, valid_data

def build_model(num_classes):
    inputs = Input(shape=(*CONFIG['img_size'], 3))
    base_model = ResNet50(
        weights='imagenet',
        include_top=False,
        input_tensor=inputs
    )

    for layer in base_model.layers[:-20]:  # Unfreeze last 20 layers for better adaptation
        layer.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'])(x)
    x = Dense(256, activation='relu', kernel_regularizer=l2(CONFIG['l2_lambda']))(x)
    x = BatchNormalization()(x)
    x = Dropout(CONFIG['dropout_rate'] * 0.5)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=inputs, outputs=predictions)

    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate'], amsgrad=True),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=CONFIG['label_smoothing']),
        metrics=['accuracy', Precision(name='precision'), Recall(name='recall')]
    )
    return model

def plot_training_history(history):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(history.history['accuracy'], label='Training')
    ax1.plot(history.history['val_accuracy'], label='Validation')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax2.plot(history.history['loss'], label='Training')
    ax2.plot(history.history['val_loss'], label='Validation')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    plt.tight_layout()
    os.makedirs(CONFIG['model_export_path'], exist_ok=True)
    plt.savefig(os.path.join(CONFIG['model_export_path'], 'training_history_resnet50.png'))
    plt.close()

def convert_to_tflite(model):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    try:
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    except Exception:
        pass
    tflite_model = converter.convert()
    tflite_path = os.path.join(CONFIG['model_export_path'], 'model_resnet50.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)

def train_model():
    train_data, valid_data = create_data_generators()
    class_weights = calculate_class_weights(train_data)
    print("\nClass weights:", class_weights)

    model = build_model(len(train_data.class_indices))

    print("\nPhase 1: Training classification head...")
    callbacks_phase1 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_resnet50_phase1.keras'),
            monitor='val_accuracy', save_best_only=True, mode='max', verbose=1
        ),
        ReduceLROnPlateau(monitor='val_accuracy', factor=CONFIG['reduce_lr_factor'],
                          patience=CONFIG['reduce_lr_patience'], min_lr=CONFIG['min_lr'], 
                          verbose=1, mode='max'),
        EarlyStopping(monitor='val_accuracy', patience=CONFIG['early_stopping_patience'],
                      min_delta=CONFIG['early_stopping_min_delta'], restore_best_weights=True, 
                      verbose=1, mode='max'),
        TensorBoard(log_dir=os.path.join(CONFIG['model_export_path'], 'logs_resnet50'), histogram_freq=1)
    ]
    history1 = model.fit(train_data, validation_data=valid_data, epochs=CONFIG['epochs'],
                         callbacks=callbacks_phase1, class_weight=class_weights, verbose=1)

    print("\nPhase 2: Fine-tuning deeper layers...")
    unfreeze_from = max(0, len(model.layers) - 40)
    for layer in model.layers[unfreeze_from:]:
        if not isinstance(layer, BatchNormalization):
            layer.trainable = True
    model.compile(optimizer=Adam(learning_rate=CONFIG['learning_rate'] * 0.1, amsgrad=True),
                  loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=CONFIG['label_smoothing']),
                  metrics=['accuracy', Precision(name='precision'), Recall(name='recall')])
    callbacks_phase2 = [
        ModelCheckpoint(
            os.path.join(CONFIG['model_export_path'], 'best_model_resnet50.keras'),
            monitor='val_accuracy', save_best_only=True, mode='max', verbose=1
        ),
        ReduceLROnPlateau(monitor='val_accuracy', factor=CONFIG['reduce_lr_factor'],
                          patience=CONFIG['reduce_lr_patience'], min_lr=CONFIG['min_lr'], 
                          verbose=1, mode='max'),
        EarlyStopping(monitor='val_accuracy', patience=CONFIG['early_stopping_patience'],
                      min_delta=CONFIG['early_stopping_min_delta'], restore_best_weights=True, 
                      verbose=1, mode='max')
    ]
    history2 = model.fit(train_data, validation_data=valid_data, epochs=CONFIG['epochs'],
                         callbacks=callbacks_phase2, class_weight=class_weights, verbose=1)

    plot_training_history(history2)
    print("\nConverting model to TFLite format...")
    convert_to_tflite(model)
    return model, history2

def main():
    print("\nStarting model training (ResNet50)...")
    try:
        model, history = train_model()
        print("\nTraining completed successfully!")
    except Exception as e:
        print(f"\nError during training: {e}")
        raise

if __name__ == "__main__":
    main()


