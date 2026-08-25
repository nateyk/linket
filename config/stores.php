<?php

return [
    // Canonical flag for stores table rename (phase 3, next release). Unifies with config/store.php alias.
    'table_rename_done' => env('STORES_TABLE_RENAME_DONE', false),
    'aliases_enabled' => true,
];
