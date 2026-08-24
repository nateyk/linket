/**
 * Temporary shim for Task 3 — canonical stores client.
 * Task 8 will regenerate via orval from api.json with SchemaName('Store').
 * For now re-export biolinks client under store naming to satisfy
 * dashboard-routes aliases (`listStores` / `retrieveStore`).
 */
export * from './biolinks';

import {
  changeBiolinkContentOrder,
  createBiolink,
  createBiolinkLink,
  createBiolinkWidget,
  deleteBiolink,
  deleteBiolinkWidget,
  detachBiolinkLink,
  listBiolinks,
  retrieveBiolink,
  updateBiolink,
  updateBiolinkAppearance,
  updateBiolinkLink,
  updateBiolinkWidget,
} from './biolinks';

export const listStores = listBiolinks;
export const createStore = createBiolink;
export const retrieveStore = retrieveBiolink;
export const updateStore = updateBiolink;
export const deleteStore = deleteBiolink;
export const updateStoreAppearance = updateBiolinkAppearance;
export const createStoreLink = createBiolinkLink;
export const updateStoreLink = updateBiolinkLink;
export const detachStoreLink = detachBiolinkLink;
export const createStoreWidget = createBiolinkWidget;
export const updateStoreWidget = updateBiolinkWidget;
export const deleteStoreWidget = deleteBiolinkWidget;
export const changeStoreContentOrder = changeBiolinkContentOrder;

// keep legacy convert/profile helpers under store naming as well
import {
  convertBiolinkToCreatorProfile,
  updateCreatorProfile,
} from './biolinks';
export const convertStoreToCreatorProfile = convertBiolinkToCreatorProfile;
export const updateStoreCreatorProfile = updateCreatorProfile;

// type aliases for convenience
export type ListStoresParams = Parameters<typeof listBiolinks>[0];
export type ListStores200 = Awaited<ReturnType<typeof listBiolinks>>;
export type RetrieveStore200 = Awaited<ReturnType<typeof retrieveBiolink>>;
