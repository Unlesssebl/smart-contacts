# Corporate Directory App (Smart Contacts)

This is a modern corporate directory application featuring a responsive glassmorphism UI.

## Key Features

- **Adaptive Pagination:** The grid dynamically calculates the optimal number of employee cards to display without causing vertical scrolling, adapting perfectly to Full HD, 2K, and Ultrawide monitors.
- **Glassmorphism Design:** Modern aesthetic with a floating radial pagination component, blurred backgrounds, and smooth framer-motion layout animations.
- **Centralized State:** Zustand handles global state, including pagination limits and current page syncing.
- **Intelligent Search:** Spotlight search in the header immediately filters through the directory, featuring a global "type-to-search" capability that automatically focuses the input when you start typing.
- **Fluid Animations:** Refined Framer Motion animations with custom bezier curves and staggered cascade delays, alongside robust `AnimatePresence` handling to maintain grid integrity during pagination.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.