import { create } from 'zustand';
import type { User } from 'firebase/auth';

export interface Workspace {
  id: string;
  name: string;
  ownerUid: string;
  ownerEmail: string;
  allowedEmails: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  workspace: Workspace | null; // the currently active workspace object
  activeWorkspaceId: string | null;
  isWorkspaceLoading: boolean;
  availableWorkspaces: Workspace[]; // ALL workspaces user has access to
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setActiveWorkspaceId: (activeWorkspaceId: string | null) => void;
  setWorkspaceLoading: (loading: boolean) => void;
  setAvailableWorkspaces: (workspaces: Workspace[]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  workspace: null,
  activeWorkspaceId: null,
  isWorkspaceLoading: false,
  availableWorkspaces: [],
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setWorkspace: (workspace) => set({ workspace }),
  setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
  setWorkspaceLoading: (isWorkspaceLoading) => set({ isWorkspaceLoading }),
  setAvailableWorkspaces: (availableWorkspaces) => set({ availableWorkspaces }),
}));
