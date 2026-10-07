import {createAsyncThunk, createSlice, type PayloadAction} from '@reduxjs/toolkit';

import type {AuthResult} from '../domain/AuthRepository';
import type {User} from '../domain/User';

import {HttpUserRepository} from '../infrastructure/HttpUserRepository';

import {
  getAccessToken,
  getSession,
  removeToken,
  saveSession,
  type StoredSession,
} from '../infrastructure/authStorage';

import {authenticatedRequest} from '../infrastructure/authenticatedRequest';

import {stopPushSession} from '../../Notifications/infrastructure/pushSession';

export type AuthState = {
  token: string | null;
  user: User | null;
  initialized: boolean;
  loading: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  initialized: false,
  loading: false,
};

export const initializeSession = createAsyncThunk(
  'auth/initializeSession',

  async () => {
    const saved = await getSession();

    if (!saved) {
      return null;
    }

    // Existing sessions created before email verification was added may not
    // contain emailVerified yet. Unverified sessions also force a refresh so
    // returning from the verification link can unlock the app immediately.
    await getAccessToken(saved.user.emailVerified !== true).catch(() => undefined);

    return getSession();
  },
);

export const establishSession = createAsyncThunk(
  'auth/establishSession',

  async (result: AuthResult) => {
    return saveSession(result);
  },
);

export const refreshEmailVerification = createAsyncThunk(
  'auth/refreshEmailVerification',

  async () => {
    const token = await getAccessToken(true);

    if (!token) {
      throw new Error('Please sign in again.');
    }

    const current = await getSession();

    if (!current) {
      throw new Error('Please sign in again.');
    }

    return current;
  },
);

export const refreshCurrentUser = createAsyncThunk(
  'auth/refreshCurrentUser',

  async () => {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('Please sign in again.');
    }

    return new HttpUserRepository().getCurrentUser(token);
  },
);

export const signOut = createAsyncThunk(
  'auth/signOut',

  async () => {
    const saved = await getSession();

    await removeToken();

    // Notification cleanup must not block logout.
    void stopPushSession(saved?.token ?? null).catch(() => undefined);
  },
);

export const deleteAccount = createAsyncThunk<
  boolean,
  void,
  {
    rejectValue: string;
  }
>(
  'auth/deleteAccount',

  async (_, {rejectWithValue}) => {
    try {
      const saved = await getSession();

      await authenticatedRequest('/auth/account', {
        method: 'DELETE',
      });

      await removeToken();

      void stopPushSession(saved?.token ?? null).catch(() => undefined);

      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Could not delete account.');
    }
  },
);

function applySession(state: AuthState, value: StoredSession | null) {
  state.token = value?.token ?? null;
  state.user = value?.user ?? null;
  state.initialized = true;
  state.loading = false;
}

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    sessionChanged(state, action: PayloadAction<StoredSession | null>) {
      applySession(state, action.payload);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(initializeSession.pending, (state) => {
        state.loading = true;
      })

      .addCase(initializeSession.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })

      .addCase(initializeSession.rejected, (state) => {
        applySession(state, null);
      })

      .addCase(establishSession.pending, (state) => {
        state.loading = true;
      })

      .addCase(establishSession.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })

      .addCase(establishSession.rejected, (state) => {
        state.loading = false;
      })

      .addCase(refreshEmailVerification.fulfilled, (state, action) => {
        applySession(state, action.payload);
      })

      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        if (state.user?.uid === action.payload.uid) {
          state.user = action.payload;
        }
      })

      .addCase(signOut.pending, (state) => {
        state.loading = true;
      })

      .addCase(signOut.fulfilled, (state) => {
        applySession(state, null);
      })

      .addCase(signOut.rejected, (state) => {
        applySession(state, null);
      })

      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
      })

      .addCase(deleteAccount.fulfilled, (state) => {
        applySession(state, null);
      })

      .addCase(deleteAccount.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {sessionChanged} = authSlice.actions;

export default authSlice.reducer;
