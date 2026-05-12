import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  loadMyProProfile,
  saveMyProProfile,
  uploadMyProPortfolioImage,
  uploadMyProShowcaseVideo,
  type MyProProfile,
} from "@/data/repositories/proProfileRepository";
import { loadMyUserProfile } from "@/data/repositories/userRepository";
import type { PortfolioAlbum, PortfolioMediaItem } from "@/features/home/types/serviceListing";
import {
  MAX_ITEMS_PER_PORTFOLIO_ALBUM,
  MAX_PORTFOLIO_ALBUMS,
} from "@/features/home/utils/portfolioAlbums";
import { freelancerProfileHref } from "@/navigation/routes";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { hasOwnerBypass } from "@/shared/domain/userRoles";
import { getFirebaseAuth } from "@/shared/firebase/client";
import { colors, radii, shadows, spacing } from "@/theme/tokens";
import { WOLT_PAGE_PADDING } from "@/theme/woltHome";

const HERO_IMAGE_LIMIT = 3;
const BIO_MAX_LENGTH = 700;
const MAX_HERO_VIDEO_DURATION_MS = 60_000;
const EMPTY_HERO = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

type EditingPart = "hero" | "info" | "bio" | "portfolio" | null;
type UploadTarget = "card" | "hero" | "video" | `album:${string}`;

function newAlbumId(): string {
  return `album_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function imageItems(album: PortfolioAlbum[]): Extract<PortfolioMediaItem, { type: "image" }>[] {
  return album.flatMap((group) =>
    group.items.filter((item): item is Extract<PortfolioMediaItem, { type: "image" }> => item.type === "image"),
  );
}

function firstAlbumCover(album: PortfolioAlbum): string | null {
  const first = album.items[0];
  if (!first) return null;
  return first.type === "image" ? first.url : first.posterUrl ?? first.url;
}

export function ProProfileEditorScreen() {
  const [profile, setProfile] = useState<MyProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [editing, setEditing] = useState<EditingPart>(null);
  const [ownerAccess, setOwnerAccess] = useState(false);
  const { width: screenW } = useWindowDimensions();
  const uid = getFirebaseAuth().currentUser?.uid ?? "";

  const reload = useCallback(() => {
    void (async () => {
      setLoading(true);
      try {
        const [nextProfile, userProfile] = await Promise.all([
          loadMyProProfile(),
          loadMyUserProfile(),
        ]);
        setProfile(nextProfile);
        setOwnerAccess(hasOwnerBypass(userProfile.role));
      } catch (e: unknown) {
        Alert.alert("Could not load profile", e instanceof Error ? e.message : "Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateProfile = (patch: Partial<MyProProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const requestImages = async (allowsMultipleSelection: boolean) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to choose images.");
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection,
      quality: 0.85,
    });
    if (result.canceled) return [];
    return result.assets.filter((asset) => asset.uri).map((asset) => asset.uri);
  };

  const requestHeroVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow video access to choose a hero video.");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    const asset = result.assets[0];
    const durationMs =
      typeof asset.duration === "number" && asset.duration > 0
        ? asset.duration < 1000
          ? asset.duration * 1000
          : asset.duration
        : 0;
    if (durationMs > MAX_HERO_VIDEO_DURATION_MS) {
      Alert.alert("Video too long", "Hero videos can be up to 1 minute.");
      return null;
    }
    return asset.uri;
  };

  const pickCardImage = async () => {
    if (!profile || uploading) return;
    try {
      setUploading("card");
      const [uri] = await requestImages(false);
      if (!uri) return;
      const url = await uploadMyProPortfolioImage(uri, "profile-card");
      updateProfile({ imageUrl: url });
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setUploading(null);
    }
  };

  const pickHeroImages = async () => {
    if (!profile || uploading) return;
    const current = profile.showcaseHero?.imageUrls ?? [];
    const room = HERO_IMAGE_LIMIT - current.length;
    if (room <= 0) return;
    try {
      setUploading("hero");
      const uris = (await requestImages(true)).slice(0, room);
      if (uris.length === 0) return;
      const urls = await Promise.all(uris.map((uri) => uploadMyProPortfolioImage(uri, "hero")));
      updateProfile({
        showcaseHero: {
          imageUrls: [...current, ...urls],
          ...(profile.showcaseHero?.video ? { video: profile.showcaseHero.video } : {}),
        },
      });
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setUploading(null);
    }
  };

  const removeHeroImage = (url: string) => {
    if (!profile) return;
    const video = profile.showcaseHero?.video;
    const imageUrls = (profile.showcaseHero?.imageUrls ?? []).filter((item) => item !== url);
    updateProfile({
      showcaseHero: imageUrls.length || video ? { imageUrls, ...(video ? { video } : {}) } : null,
    });
  };

  const pickHeroVideo = async () => {
    if (!profile || uploading) return;
    try {
      setUploading("video");
      const uri = await requestHeroVideo();
      if (!uri) return;
      const url = await uploadMyProShowcaseVideo(uri);
      const imageUrls = profile.showcaseHero?.imageUrls ?? [];
      const posterUrl = imageUrls[0] || profile.imageUrl.trim() || undefined;
      updateProfile({
        showcaseHero: {
          imageUrls,
          video: {
            url,
            ...(posterUrl ? { posterUrl } : {}),
          },
        },
      });
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setUploading(null);
    }
  };

  const removeHeroVideo = () => {
    if (!profile) return;
    const imageUrls = profile.showcaseHero?.imageUrls ?? [];
    updateProfile({
      showcaseHero: imageUrls.length > 0 ? { imageUrls } : null,
    });
  };

  const addAlbum = () => {
    if (!profile || profile.portfolioAlbums.length >= MAX_PORTFOLIO_ALBUMS) return;
    updateProfile({
      portfolioAlbums: [
        ...profile.portfolioAlbums,
        { id: newAlbumId(), title: "New project", items: [] },
      ],
    });
  };

  const updateAlbum = (albumId: string, patch: Partial<PortfolioAlbum>) => {
    if (!profile) return;
    updateProfile({
      portfolioAlbums: profile.portfolioAlbums.map((album) =>
        album.id === albumId ? { ...album, ...patch } : album,
      ),
    });
  };

  const removeAlbum = (albumId: string) => {
    if (!profile) return;
    updateProfile({
      portfolioAlbums: profile.portfolioAlbums.filter((album) => album.id !== albumId),
    });
  };

  const pickAlbumImages = async (album: PortfolioAlbum) => {
    if (!profile || uploading) return;
    const room = MAX_ITEMS_PER_PORTFOLIO_ALBUM - album.items.length;
    if (room <= 0) return;
    try {
      setUploading(`album:${album.id}`);
      const uris = (await requestImages(true)).slice(0, room);
      if (uris.length === 0) return;
      const urls = await Promise.all(
        uris.map((uri) => uploadMyProPortfolioImage(uri, `album-${album.id}`)),
      );
      updateAlbum(album.id, {
        items: [...album.items, ...urls.map((url) => ({ type: "image" as const, url }))],
      });
    } catch (e: unknown) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setUploading(null);
    }
  };

  const removeAlbumItem = (albumId: string, url: string) => {
    if (!profile) return;
    const album = profile.portfolioAlbums.find((item) => item.id === albumId);
    if (!album) return;
    updateAlbum(albumId, { items: album.items.filter((item) => item.url !== url) });
  };

  const saveAll = async () => {
    if (!profile || saving) return;
    setSaving(true);
    try {
      const profileToSave = { ...profile, bio: profile.bio.slice(0, BIO_MAX_LENGTH) };
      if (profileToSave.bio !== profile.bio) setProfile(profileToSave);
      await saveMyProProfile(profileToSave);
      Alert.alert("Saved", "The customer profile was updated.");
    } catch (e: unknown) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const preview = () => {
    if (!uid) return;
    router.push(freelancerProfileHref(uid));
  };

  if (loading || !profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Profile page" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const approved = ownerAccess || profile.verificationStatus === "approved";
  if (!approved) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Profile page" />
        <View style={styles.centered}>
          <Text style={styles.lockedTitle}>Available after approval</Text>
          <Text style={styles.mutedCenter}>
            Once this provider is approved, this page becomes the profile editor.
          </Text>
        </View>
      </View>
    );
  }

  const heroImages = profile.showcaseHero?.imageUrls ?? [];
  const heroVideo = profile.showcaseHero?.video;
  const heroImage = heroVideo?.posterUrl || heroImages[0] || profile.imageUrl.trim() || EMPTY_HERO;
  const displayTitle = profile.title.trim() || "Tap to add your business name";
  const displaySubtitle = profile.subtitle.trim() || "Tap here to add what you do";
  const bio = profile.bio.trim();
  const albumImages = imageItems(profile.portfolioAlbums);
  const inner = screenW - 2 * WOLT_PAGE_PADDING;
  const tileSize = (inner - 20) / 3;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Profile page" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <EditableBlock style={styles.heroWrap} onPress={() => setEditing("hero")}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroScrim} />
          <View style={styles.tapBadge}>
            <Ionicons name={heroVideo ? "play-circle-outline" : "image-outline"} size={16} color={colors.background} />
            <Text style={styles.tapBadgeText}>Edit hero</Text>
          </View>
          {heroVideo ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={17} color={colors.background} />
              <Text style={styles.videoBadgeText}>Hero video</Text>
            </View>
          ) : null}
          {heroImages.length === 0 && !heroVideo ? (
            <Text style={styles.emptyHeroText}>Tap to add hero photos or video</Text>
          ) : null}
        </EditableBlock>

        <View style={styles.pad}>
          <EditableBlock style={styles.intro} onPress={() => setEditing("info")}>
            <View style={styles.introTop}>
              {profile.imageUrl.trim() ? (
                <Image source={{ uri: profile.imageUrl.trim() }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.titleCol}>
                <Text style={styles.name}>{displayTitle}</Text>
                <Text style={styles.tagline}>{displaySubtitle}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statText}>{profile.eta.trim() || "ETA"}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statText}>{profile.fee.trim() || "Starting price"}</Text>
              </View>
              {profile.isLicensed ? (
                <View style={styles.statPill}>
                  <Text style={styles.statText}>Licensed</Text>
                </View>
              ) : null}
              {profile.isInsured ? (
                <View style={styles.statPill}>
                  <Text style={styles.statText}>Insured</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.editHint}>Tap to edit name, card photo, ETA, and price</Text>
          </EditableBlock>

          <EditableBlock style={styles.section} onPress={() => setEditing("bio")}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={[styles.bodyText, !bio && styles.placeholderText]}>
              {bio || "Tap to write your bio. Tell customers what you do, how you work, and why they should trust you."}
            </Text>
          </EditableBlock>

          <EditableBlock style={styles.section} onPress={() => setEditing("portfolio")}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            {profile.portfolioAlbums.length === 0 ? (
              <View style={styles.emptyPortfolio}>
                <Ionicons name="images-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>Tap to add portfolio albums</Text>
              </View>
            ) : (
              <View style={styles.albumGrid}>
                {profile.portfolioAlbums.slice(0, 6).map((album) => {
                  const cover = firstAlbumCover(album);
                  return (
                    <View key={album.id} style={{ width: tileSize }}>
                      <View style={[styles.albumCover, { width: tileSize, height: tileSize }]}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.fill} contentFit="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                        )}
                      </View>
                      <Text style={styles.albumTitle} numberOfLines={2}>
                        {album.title || "Project"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            {albumImages.length > 0 ? (
              <Text style={styles.editHint}>Tap to edit albums and photos</Text>
            ) : null}
          </EditableBlock>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.previewBtn} onPress={preview}>
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
          <Text style={styles.previewBtnText}>Preview</Text>
        </Pressable>
        <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={() => void saveAll()} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving" : "Save"}</Text>
        </Pressable>
      </View>

      <EditSheet
        part={editing}
        profile={profile}
        uploading={uploading}
        onClose={() => setEditing(null)}
        onChange={updateProfile}
        onPickCardImage={pickCardImage}
        onPickHeroImages={pickHeroImages}
        onPickHeroVideo={pickHeroVideo}
        onRemoveHeroImage={removeHeroImage}
        onRemoveHeroVideo={removeHeroVideo}
        onAddAlbum={addAlbum}
        onUpdateAlbum={updateAlbum}
        onRemoveAlbum={removeAlbum}
        onPickAlbumImages={pickAlbumImages}
        onRemoveAlbumItem={removeAlbumItem}
      />
    </View>
  );
}

function EditableBlock({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable style={[styles.editableBlock, style]} onPress={onPress}>
      {children}
      <View style={styles.editPencil}>
        <Ionicons name="pencil" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function EditSheet({
  part,
  profile,
  uploading,
  onClose,
  onChange,
  onPickCardImage,
  onPickHeroImages,
  onPickHeroVideo,
  onRemoveHeroImage,
  onRemoveHeroVideo,
  onAddAlbum,
  onUpdateAlbum,
  onRemoveAlbum,
  onPickAlbumImages,
  onRemoveAlbumItem,
}: {
  part: EditingPart;
  profile: MyProProfile;
  uploading: UploadTarget | null;
  onClose: () => void;
  onChange: (patch: Partial<MyProProfile>) => void;
  onPickCardImage: () => void;
  onPickHeroImages: () => void;
  onPickHeroVideo: () => void;
  onRemoveHeroImage: (url: string) => void;
  onRemoveHeroVideo: () => void;
  onAddAlbum: () => void;
  onUpdateAlbum: (albumId: string, patch: Partial<PortfolioAlbum>) => void;
  onRemoveAlbum: (albumId: string) => void;
  onPickAlbumImages: (album: PortfolioAlbum) => void;
  onRemoveAlbumItem: (albumId: string, url: string) => void;
}) {
  if (!part) return null;
  const closeSheet = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeSheet}>
      <KeyboardAvoidingView
        style={styles.sheetKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheetScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {part === "hero" ? "Hero" : part === "info" ? "Main info" : part === "bio" ? "Bio" : "Portfolio"}
              </Text>
              <View style={styles.sheetHeaderActions}>
                <Pressable style={styles.sheetDoneBtn} onPress={closeSheet} hitSlop={8}>
                  <Text style={styles.sheetDoneText}>Done</Text>
                </Pressable>
                <Pressable onPress={closeSheet} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {part === "hero" ? (
              <>
                <Text style={styles.sheetHelp}>
                  These photos and one video appear at the top of the customer profile.
                </Text>
                <ImageRow
                  urls={profile.showcaseHero?.imageUrls ?? []}
                  onRemove={onRemoveHeroImage}
                  onAdd={onPickHeroImages}
                  addLabel={uploading === "hero" ? "Uploading" : "Add photo"}
                  canAdd={(profile.showcaseHero?.imageUrls.length ?? 0) < HERO_IMAGE_LIMIT}
                />
                <View style={styles.heroVideoRow}>
                  <View style={styles.heroVideoIcon}>
                    <Ionicons name="play-circle-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.heroVideoText}>
                    <Text style={styles.heroVideoTitle}>
                      {profile.showcaseHero?.video?.url ? "Hero video added" : "Hero video"}
                    </Text>
                    <Text style={styles.heroVideoMeta}>Optional, up to 1 minute.</Text>
                  </View>
                  {profile.showcaseHero?.video?.url ? (
                    <Pressable style={styles.removeVideoBtn} onPress={onRemoveHeroVideo}>
                      <Text style={styles.removeVideoText}>Remove</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.addBtn} onPress={onPickHeroVideo} disabled={uploading !== null}>
                      <Text style={styles.addBtnText}>
                        {uploading === "video" ? "Uploading" : "Add video"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : null}

            {part === "info" ? (
              <>
                <TextInput
                  value={profile.title}
                  onChangeText={(title) => onChange({ title })}
                  placeholder="Business name"
                  style={styles.input}
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  value={profile.subtitle}
                  onChangeText={(subtitle) => onChange({ subtitle })}
                  placeholder="What do you do?"
                  style={styles.input}
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.inputRow}>
                  <TextInput
                    value={profile.eta}
                    onChangeText={(eta) => onChange({ eta })}
                    placeholder="ETA"
                    style={[styles.input, styles.inputHalf]}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    value={profile.fee}
                    onChangeText={(fee) => onChange({ fee })}
                    placeholder="Price"
                    style={[styles.input, styles.inputHalf]}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.cardImageRow}>
                  {profile.imageUrl.trim() ? (
                    <Image source={{ uri: profile.imageUrl.trim() }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.avatarEmpty]} />
                  )}
                  <Pressable style={styles.addBtn} onPress={onPickCardImage}>
                    <Text style={styles.addBtnText}>{uploading === "card" ? "Uploading" : "Change card photo"}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {part === "bio" ? (
              <>
                <TextInput
                  value={profile.bio}
                  onChangeText={(bio) => onChange({ bio: bio.slice(0, BIO_MAX_LENGTH) })}
                  placeholder="Write what customers should know..."
                  style={[styles.input, styles.bioInput]}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={BIO_MAX_LENGTH}
                  blurOnSubmit
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  textAlignVertical="top"
                />
                <Text style={styles.bioCounter}>
                  {Math.min(profile.bio.length, BIO_MAX_LENGTH)}/{BIO_MAX_LENGTH}
                </Text>
              </>
            ) : null}

            {part === "portfolio" ? (
              <>
                <View style={styles.sheetActionRow}>
                  <Text style={styles.sheetHelp}>Albums appear under Portfolio.</Text>
                  <Pressable
                    style={styles.addBtn}
                    onPress={onAddAlbum}
                    disabled={profile.portfolioAlbums.length >= MAX_PORTFOLIO_ALBUMS}
                  >
                    <Text style={styles.addBtnText}>Add album</Text>
                  </Pressable>
                </View>
                {profile.portfolioAlbums.map((album) => (
                  <View key={album.id} style={styles.albumEditor}>
                    <View style={styles.albumEditorHeader}>
                      <TextInput
                        value={album.title}
                        onChangeText={(title) => onUpdateAlbum(album.id, { title })}
                        placeholder="Album title"
                        style={styles.albumInput}
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Pressable onPress={() => onRemoveAlbum(album.id)} hitSlop={10}>
                        <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                      </Pressable>
                    </View>
                    <ImageRow
                      urls={album.items.filter((item) => item.type === "image").map((item) => item.url)}
                      onRemove={(url) => onRemoveAlbumItem(album.id, url)}
                      onAdd={() => onPickAlbumImages(album)}
                      addLabel={uploading === `album:${album.id}` ? "Uploading" : "Add photo"}
                      canAdd={album.items.length < MAX_ITEMS_PER_PORTFOLIO_ALBUM}
                    />
                  </View>
                ))}
              </>
            ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ImageRow({
  urls,
  onRemove,
  onAdd,
  addLabel,
  canAdd,
}: {
  urls: string[];
  onRemove: (url: string) => void;
  onAdd: () => void;
  addLabel: string;
  canAdd: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
      {urls.map((url) => (
        <View key={url} style={styles.thumb}>
          <Image source={{ uri: url }} style={styles.fill} contentFit="cover" />
          <Pressable style={styles.thumbRemove} onPress={() => onRemove(url)}>
            <Ionicons name="close" size={14} color={colors.background} />
          </Pressable>
        </View>
      ))}
      {canAdd ? (
        <Pressable style={styles.addPhotoTile} onPress={onAdd}>
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addPhotoText}>{addLabel}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDFD" },
  scroll: { flex: 1 },
  body: { paddingBottom: 98 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  muted: { color: colors.textSecondary, fontSize: 14 },
  mutedCenter: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center" },
  lockedTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  pad: { paddingHorizontal: WOLT_PAGE_PADDING, paddingTop: spacing.lg, gap: spacing.lg },
  editableBlock: { position: "relative" },
  editPencil: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    ...shadows.button,
  },
  heroWrap: {
    height: 320,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  tapBadge: {
    position: "absolute",
    left: WOLT_PAGE_PADDING,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.button,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  tapBadgeText: { color: colors.background, fontWeight: "800", fontSize: 13 },
  emptyHeroText: {
    position: "absolute",
    left: WOLT_PAGE_PADDING,
    right: WOLT_PAGE_PADDING,
    top: "45%",
    color: colors.background,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  videoBadge: {
    position: "absolute",
    right: WOLT_PAGE_PADDING,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radii.button,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  videoBadgeText: { color: colors.background, fontWeight: "900", fontSize: 13 },
  intro: {
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3D7D9",
  },
  introTop: { flexDirection: "row", gap: spacing.md, alignItems: "center", paddingRight: 38 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.surfaceSoft },
  avatarEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  titleCol: { flex: 1 },
  name: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: 15,
    fontWeight: "600",
    color: "#57534E",
    lineHeight: 22,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  statPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.chip,
    backgroundColor: "#F5F5F4",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E7E5E4",
  },
  statText: { fontSize: 13, fontWeight: "700", color: "#44403C" },
  editHint: { marginTop: spacing.sm, fontSize: 12, color: colors.primary, fontWeight: "800" },
  section: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F3D7D9",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.sm },
  bodyText: { fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  placeholderText: { color: colors.textSecondary, lineHeight: 20 },
  emptyPortfolio: {
    minHeight: 116,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  albumGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  albumCover: {
    borderRadius: radii.image,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  albumTitle: { marginTop: 6, fontSize: 12, fontWeight: "700", color: colors.textPrimary, lineHeight: 15 },
  fill: { width: "100%", height: "100%" },
  bottomBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 8,
    borderRadius: 22,
    backgroundColor: colors.background,
    ...shadows.floating,
  },
  previewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceSoft,
  },
  previewBtnText: { color: colors.primary, fontWeight: "900", fontSize: 14 },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
  },
  saveBtnText: { color: colors.background, fontWeight: "900", fontSize: 14 },
  disabled: { opacity: 0.55 },
  sheetKeyboard: { flex: 1 },
  sheetScrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  sheetHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sheetDoneBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    backgroundColor: "#FFF1F2",
  },
  sheetDoneText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  sheetBody: { padding: spacing.lg, gap: spacing.md },
  sheetHelp: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  input: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputRow: { flexDirection: "row", gap: spacing.sm },
  inputHalf: { flex: 1 },
  bioInput: { minHeight: 180, lineHeight: 22 },
  bioCounter: {
    alignSelf: "flex-end",
    marginTop: -spacing.xs,
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  cardImageRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardImage: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.surfaceSoft },
  addBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    backgroundColor: "#FFF1F2",
  },
  addBtnText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  heroVideoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  heroVideoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },
  heroVideoText: { flex: 1 },
  heroVideoTitle: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  heroVideoMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  removeVideoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: radii.button,
    backgroundColor: "#FEF2F2",
  },
  removeVideoText: { color: colors.destructive, fontSize: 13, fontWeight: "900" },
  sheetActionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  imageRow: { gap: spacing.sm, paddingVertical: 2 },
  thumb: {
    width: 104,
    height: 88,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  addPhotoTile: {
    width: 104,
    height: 88,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: "#FFF7F7",
  },
  addPhotoText: { color: colors.primary, fontSize: 12, fontWeight: "900", textAlign: "center" },
  albumEditor: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  albumEditorHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  albumInput: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },
});
