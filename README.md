# kappi

## iOS (EAS Build)

This section outlines how to build the iOS version of the app using Expo Application Services (EAS). EAS enables you to build your iOS app in the cloud without needing a macOS environment or Xcode installed locally.

### Prerequisites

1.  **Expo Account**: You need an Expo account. If you don't have one, sign up at [expo.dev](https://expo.dev/).
2.  **EAS CLI**: Install the EAS CLI globally:
    ```bash
    npm install -g eas-cli
    ```
    or
    ```bash
    yarn global add eas-cli
    ```

### Authentication and Secrets

To use EAS Build, you need to authenticate your Expo account and manage certain secrets.

1.  **EXPO_TOKEN**:
    -   Log in to your Expo account using the EAS CLI:
        ```bash
        npx eas login
        ```
    -   Create an Expo token:
        ```bash
        npx eas token:create
        ```
    -   Add this token to your GitHub repository secrets as `EXPO_TOKEN`.

2.  **App Store Connect API Key (Recommended for CI/CD)**:
    For automated App Store submissions in CI/CD, it's recommended to use an App Store Connect API Key.
    -   Follow the instructions in the [EAS documentation](https://docs.expo.dev/submit/api-keys/) to create an App Store Connect API Key.
    -   Save the API Key JSON content as a GitHub secret named `ASC_KEY`.

3.  **APPLE_TEAM_ID (Optional)**:
    If you encounter issues with EAS detecting your Apple Developer Team, you can explicitly provide your Apple Team ID.
    -   Add your Apple Team ID to your GitHub repository secrets as `APPLE_TEAM_ID`.

### Local Build Commands

Ensure you are in the `client/` directory before running these commands.

-   **Development Build (for internal testing)**:
    This profile creates a development build that can be installed on registered test devices.
    ```bash
    npx eas build -p ios --profile development
    ```

-   **Production Build (for App Store submission)**:
    This profile creates an `.ipa` file suitable for submission to the Apple App Store.
    ```bash
    npx eas build -p ios --profile production
    ```

**Important**: The prebuild and Pod installation steps run within the EAS macOS environment. Do NOT commit the `ios/` directory if it was generated on a Windows machine, as it might contain platform-specific configurations that could interfere with the build process.