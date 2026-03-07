import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Favourites store — persists to localStorage.
 *
 * Each favourite is stored as { id, type, data, addedAt }
 *   type: 'word' | 'grammar' | 'verb' | 'knm'
 *   data: snapshot of the item (word object, grammar topic, verb, etc.)
 */
const useFavourites = create(
  persist(
    (set, get) => ({
      favourites: [],

      // Toggle a favourite — add if not present, remove if already saved
      toggleFavourite: (id, type, data) => {
        set((state) => {
          const exists = state.favourites.some((f) => f.id === id);
          if (exists) {
            return { favourites: state.favourites.filter((f) => f.id !== id) };
          } else {
            return {
              favourites: [
                { id, type, data, addedAt: new Date().toISOString() },
                ...state.favourites,
              ],
            };
          }
        });
      },

      isFavourite: (id) => {
        return get().favourites.some((f) => f.id === id);
      },

      getFavouritesByType: (type) => {
        return get().favourites.filter((f) => f.type === type);
      },

      clearFavourites: () => set({ favourites: [] }),
    }),
    {
      name: 'pria-favourites',
      version: 1,
      migrate: (state) => state,
    }
  )
);

export default useFavourites;
