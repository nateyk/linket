# Digital Product Mutation Service Design

## Goal

Move digital-product create and update mutation work out of `DigitalProductsController` while preserving every existing route, request payload, response resource, transaction boundary, and lifecycle rule.

## Scope

Create `App\Storefront\DigitalProductMutationService` for product creation and updates only.

The service owns:

- Creating or updating the `DigitalProduct` model.
- Validating that a cover belongs to the product workspace and is an image.
- Validating downloadable files belong to the product workspace, meet allowed-extension and size limits, and fit the existing storage allowance calculation.
- Synchronizing downloadable files.
- Ensuring a course exists for course products.
- Synchronizing Storefront placement through `DigitalProductVisibility`.
- Wrapping each complete mutation in a database transaction.

The controller continues to own:

- HTTP request validation.
- Product ownership authorization.
- Course-creation entitlement checks.
- Product-count entitlement checks.
- Index, show, submit, and destroy endpoints.
- Converting returned products to `DigitalProductResource`.

Submission behavior is explicitly out of scope. Draft/rejected submission rules and course publishing transitions remain unchanged in `DigitalProductsController::submit`.

## Service Interface

```php
final class DigitalProductMutationService
{
    public function create(
        array $data,
        User $creator,
        ?int $maxUploadBytes,
    ): DigitalProduct;

    public function update(
        DigitalProduct $product,
        array $data,
        ?int $maxUploadBytes,
    ): DigitalProduct;
}
```

The service uses constructor injection for `CourseService` and `DigitalProductVisibility`. It loads `files`, `cover`, `biolinks`, and `course` before returning, matching the controller's current create and update response data.

`create` receives already-validated input and a creator. It derives the current workspace through the existing `ActiveWorkspace` abstraction, sets the current storefront currency when omitted, and creates a course when `type` is `course`.

`update` receives an already-authorized product and already-validated input. It preserves the current type and currency when absent, resets approved products to draft exactly as before, and only modifies file associations when `file_ids` is present for course products.

## Mutation Rules

- Non-course products require `file_ids`; the controller validation remains the source of that requirement.
- Course products may omit `file_ids`. A provided empty array clears files; an omitted key preserves them.
- `biolink_ids` defaults to the product's current placement on update and to an empty array on creation.
- Cover and file validation failures abort with the existing `422` status and messages.
- A validation failure rolls back all product, file, course, and Storefront placement changes in the active transaction.
- The service does not perform request authorization or entitlement counting; this avoids duplicating controller policy decisions.

## Testing

Existing feature tests remain the behavioral contract for create/update paths, including foreign cover rejection, foreign downloadable-file rejection, rollback without an orphaned product, course setup, and Storefront placement.

Add service-focused tests only if extracting the service reveals behavior that cannot be verified through the existing API feature tests. No endpoint, payload, or resource contract test is changed solely because of the refactor.
