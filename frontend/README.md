# Frontend
The UI is written using React Native with Typescript.

## How to run
* Open a terminal in the frontent/client directory
* Make sure you have [Node installed](https://nodejs.org/en/download)
* Install yarn with `npm install --global yarn`
* install expo with `yarn add expo`
* Install libraries with `yarn install`
* Download the [Expo Go App](https://apps.apple.com/app/id982107779)
* run `npx expo start` and scan the QR code with your phone. Follow the options on the screen for more things, such as as simulator (iOS requires Xcode on a Mac).

## Environment Variable
* Create a .env in the frontend/cliennt directory
* Environment variables must start with EXPO_PUBLIC
* An example api url would be: `EXPO_PUBLIC_API_URL=http://216.37.99.210:9090`
