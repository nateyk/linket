// Canonical stores page — re-exports legacy biolinks page until final move (Task 4).
// Keeping same Component export so lazy import `() => import('@app/dashboard/stores/stores-page')` works.
export * from '../biolink/biolinks-page';
