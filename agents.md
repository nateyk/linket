# Code Style and Structure for Frontend (React, TypeScript)

- Prefer using components from shadcn library from "common/foundation/resources/client/shadcn" folder. If component is not available there, use one from "common/foundation/resources/client/ui" instead.
- Always use <Trans message="some text" /> component, instead of just plain text. If possible use static text tring as "message" prop for Trans component, otherwise translation string can't be extracted.
- For icons, uside lucide icon library.

# Code style for styling (Tailwind)

- use available design tokens from common-tailwind.css file when possible, instead of direct values (e.g. text-muted-foreground instead of text-gray-200)

# Code Style and Structure for Backend (PHP and Laravel)

- Don't use dependency injection when possible. Instead use laravel helpers like request() and facades.
- Don't use raw strings when specifying classes (e.g. "App\Models\User") use "User::class" syntax instead.
- Use latest php 8.2 feature, including arrow functions, spread operators, array unpacking etc.
