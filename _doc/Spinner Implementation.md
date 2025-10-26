# Implementing a Loading Spinner in the Angular Client

To add a loading spinner that appears while an `.ot` file is being processed, you can follow these steps within the Angular client application:

1.  **State Management in `map-viewport-component.ts`**:
    Introduce a `signal` to manage the loading state. Let's call it `isLoading`. Set this signal to `true` at the very beginning of the `handleFileInput` method, right after a file is selected.

2.  **Asynchronous Operation Handling**:
    The file conversion (`octomap2json`) is an asynchronous operation. Wrap the core logic of `handleFileInput` in a `try...finally` block. This ensures that no matter if the operation succeeds or fails, `isLoading` is set back to `false` in the `finally` block, which will hide the spinner.

3.  **Template Modification in `map-viewport-component.html`**:
    Add a new element for the spinner, like a `<div>`. This element's visibility will be controlled by the `isLoading` signal using the `*ngIf` directive. For this, you'll need to import `NgIf` into the `MapViewportComponent`. The spinner element would overlay the whole viewport.

4.  **Styling the Spinner**:
    In `map-viewport-component.scss`, add CSS rules to style the overlay (e.g., a semi-transparent background) and the spinner itself (e.g., a rotating circle using CSS animations). This should be positioned with a high `z-index` to appear on top of everything else.

This approach ensures the user gets immediate feedback after selecting a file, and the spinner is reliably removed once the map is rendered or an error occurs.
