/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudioTab, MediaItem } from './types';
import {
  INITIAL_MEDIA_ITEMS,
  SPACE_STATION_THUMBNAIL_BASE64,
  ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64,
  NEON_SEOUL_IMAGE_THUMBNAIL_BASE64,
} from './mockData';
import { AndroidShell } from './components/AndroidShell';
import { FlowStudio } from './components/FlowStudio';
import { MusicStudio } from './components/MusicStudio';
import { VaultHub } from './components/VaultHub';
import { ShareModal } from './components/ShareModal';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { GoogleAuthProvider } from './GoogleAuthContext';
import { GoogleAuthModal } from './components/GoogleAuthModal';

const STORAGE_KEY = 'gemini_omnistudio_media_items_v2';

export default function App() {
  const [currentTab, setCurrentTab] = useState<StudioTab>('flow');
  const [tabContextData, setTabContextData] = useState<any>(null);

  // Load saved media items from local storage or fallback to mock seed with array validation
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: MediaItem) => {
            let updated = { ...item };
            if (updated.type === 'video' && (!updated.url || updated.url.includes('ForBiggerBlazes') || updated.url.startsWith('data:image/svg'))) {
              updated.url = '/assets/neon_city_veo3.mp4';
            }
            if (updated.type === 'project' && updated.metadata?.bundleVideoUrl && (updated.metadata.bundleVideoUrl.includes('ForBiggerBlazes') || updated.metadata.bundleVideoUrl.startsWith('data:image/svg'))) {
              updated.metadata = { ...updated.metadata, bundleVideoUrl: '/assets/neon_city_veo3.mp4' };
            }

            // CRITICAL FIX: Ensure thumbnails are valid base64 images, NOT mp4 and NOT invalid SVGs
            const hasInvalidThumbnail = !updated.thumbnail || updated.thumbnail.endsWith('.mp4') || updated.thumbnail.includes('.mp4') || updated.thumbnail.startsWith('data:image/svg+xml;utf8');

            if (updated.title?.includes('우주 정거장') || updated.title?.includes('궤도 유영')) {
              updated.thumbnail = SPACE_STATION_THUMBNAIL_BASE64;
            } else if (updated.title?.includes('궤도 스테이션') || updated.type === 'project') {
              if (hasInvalidThumbnail || updated.title?.includes('신스웨이브')) {
                updated.thumbnail = ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64;
              }
            } else if (updated.type === 'video' && hasInvalidThumbnail) {
              updated.thumbnail = SPACE_STATION_THUMBNAIL_BASE64;
            } else if (updated.type === 'image' && hasInvalidThumbnail) {
              updated.thumbnail = updated.url || NEON_SEOUL_IMAGE_THUMBNAIL_BASE64;
            }

            return updated;
          });
        }
      }
    } catch {
      // LocalStorage access fallback
    }
    return INITIAL_MEDIA_ITEMS;
  });

  // Modal states
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (Array.isArray(mediaItems)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mediaItems));
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [mediaItems]);

  const handleAddMedia = (item: MediaItem) => {
    setMediaItems((prev) => [item, ...(Array.isArray(prev) ? prev : [])]);
  };

  const handleDeleteMedia = (id: string) => {
    setMediaItems((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== id) : []));
  };

  const handleNavigateTab = (tab: StudioTab, contextData?: any) => {
    let safeTab: StudioTab = tab;
    // Map any legacy v1 studio tab names cleanly to Flow
    if (tab === 'video' || tab === 'image' || tab === 'director' || tab === 'html') {
      safeTab = 'flow';
    }
    setTabContextData(contextData || null);
    setCurrentTab(safeTab);
  };

  // Ensure activeTab is strictly one of the 3 supported tabs
  const activeTab: StudioTab =
    currentTab === 'flow' || currentTab === 'music' || currentTab === 'vault' ? currentTab : 'flow';

  return (
    <GoogleAuthProvider>
      <AndroidShell
        currentTab={activeTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
      >
        {/* Dynamic 3 Tab Views: Persistent in DOM to maintain background generation & playback */}
        <div className={activeTab === 'flow' ? 'block h-full' : 'hidden'}>
          <FlowStudio
            onAddMedia={handleAddMedia}
            onOpenShare={(item) => setShareItem(item)}
            onNavigateTab={handleNavigateTab}
            initialContext={tabContextData}
          />
        </div>

        <div className={activeTab === 'music' ? 'block h-full' : 'hidden'}>
          <MusicStudio
            onAddMedia={handleAddMedia}
            onOpenShare={(item) => setShareItem(item)}
            onNavigateTab={handleNavigateTab}
            initialContext={tabContextData}
          />
        </div>

        <div className={activeTab === 'vault' ? 'block h-full' : 'hidden'}>
          <VaultHub
            mediaItems={Array.isArray(mediaItems) ? mediaItems : INITIAL_MEDIA_ITEMS}
            onOpenShare={(item) => setShareItem(item)}
            onNavigateTab={handleNavigateTab}
            onDeleteMedia={handleDeleteMedia}
            onAddMedia={handleAddMedia}
          />
        </div>

        {/* Android Quick Share & Interconnect Modal */}
        <ShareModal
          item={shareItem}
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          onNavigateTab={handleNavigateTab}
        />

        {/* PWA & Android Installation Guide */}
        <PWAInstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
        />

        {/* Google Account & CORS Proxy Manager Modal */}
        <GoogleAuthModal />
      </AndroidShell>
    </GoogleAuthProvider>
  );
}
