import {
    launchImageLibrary,
    ImagePickerResponse 
} from 'react-native-image-picker';

export class GalleryService {
    static async openGallery(): Promise<ImagePickerResponse | null> {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
            return null;
        }

        return result;
    }
}