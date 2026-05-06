import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

async function ensureLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photos access",
      "Allow photo library access to choose a profile picture.",
    );
    return false;
  }
  return true;
}

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Camera access", "Allow camera access to take a profile picture.");
    return false;
  }
  return true;
}

export async function pickProfilePhotoFromLibrary(): Promise<string | null> {
  if (!(await ensureLibraryPermission())) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function pickProfilePhotoFromCamera(): Promise<string | null> {
  if (!(await ensureCameraPermission())) return null;
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
