/**
 * Compatibility shim — canonical client is `./stores`.
 * Keep legacy `biolinks` imports working for one release.
 * Generated stores contain the canonical `listStores`, `retrieveStore`, etc.
 */
export * from './stores';
export * from './store-widgets';
export * from './store-appearance';

import {
  changeStoreContentOrder,
  convertStoreToCreatorProfile,
  createStore,
  createStoreLink,
  deleteStore,
  detachStoreLink,
  listStores,
  retrieveStore,
  updateStore,
  updateStoreCreatorProfile,
  updateStoreLink,
} from './stores';

import {
  createStoreWidget,
  deleteStoreWidget,
  updateStoreWidget,
} from './store-widgets';

import {updateStoreAppearance} from './store-appearance';

// Legacy aliases — old code still imports `listBiolinks` etc. from `gen/biolinks`
export const listBiolinks = listStores;
export const createBiolink = createStore;
export const retrieveBiolink = retrieveStore;
export const updateBiolink = updateStore;
export const deleteBiolink = deleteStore;
export const updateCreatorProfile = updateStoreCreatorProfile;
export const convertBiolinkToCreatorProfile = convertStoreToCreatorProfile;
export const createBiolinkLink = createStoreLink;
export const updateBiolinkLink = updateStoreLink;
export const detachBiolinkLink = detachStoreLink;
export const createBiolinkWidget = createStoreWidget;
export const updateBiolinkWidget = updateStoreWidget;
export const deleteBiolinkWidget = deleteStoreWidget;
export const changeBiolinkContentOrder = changeStoreContentOrder;
export const updateBiolinkAppearance = updateStoreAppearance;
