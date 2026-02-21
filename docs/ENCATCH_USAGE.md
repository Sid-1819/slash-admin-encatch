# Encatch Methods Usage in Slash Admin

This document lists all Encatch SDK methods available in the app and every place in the codebase where they are used.

---

## 1. Encatch API surface (`window.encatch`)

The app uses `@encatch/web-sdk` and exposes a `window.encatch` adapter in `src/lib/encatch.ts`. The following methods are available:

| Method | Description |
|--------|-------------|
| `trackEvent(eventName, properties?)` | Track a custom event. (Note: adapter currently forwards only `eventName` to the SDK.) |
| `identify(userId, traits?)` | Identify the user with an ID and optional traits (`$set`, `$set_once`, `$counter`, `$unset`, or flat object). |
| `setThemeMode(theme)` | Set theme: `"light"` or `"dark"`. |
| `setLanguage(language)` | Set locale/language. |
| `openFeedbackById(feedbackConfigurationId)` | Open the feedback form by configuration ID. |
| `openFeedbackByName(name)` | Not supported; logs a warning. Use `openFeedbackById` instead. |
| `capturePageScrollEvent(scrollPercent)` | Track scroll progress (e.g. `"25%"`, `"50%"`). Internally sends `page_scroll_${scrollPercent}`. |

**Initialization:** `initEncatch()` in `src/lib/encatch.ts` is called once via `EncatchProvider` in `src/App.tsx`.

---

## 2. Usage by method

### 2.1 `trackEvent(eventName, properties?)`

| File | Event / usage |
|------|----------------|
| `src/pages/sys/login/login-form.tsx` | `trackEvent("customEvent", { login: "User logged in" })` after successful sign-in. |
| `src/pages/sys/login/login-form.tsx` | `trackEvent("customEvent", { login: "Guest logged in" })` after guest login. |
| `src/layouts/components/account-dropdown.tsx` | `trackEvent("customEvent", { logout: "User logged out" })` on logout. |
| `src/pages/management/user/profile/index.tsx` | `trackEvent("feedback_button_clicked", { page: "user_profile", source: "profile_page" })` when opening feedback from profile. |
| `src/pages/dashboard/workbench/index.tsx` | `trackEvent("feedback_button_clicked", { page: "dashboard_workbench", source: "workbench_page" })` when opening feedback from workbench. |
| `src/pages/dashboard/workbench/banner-card.tsx` | `trackEvent("join_discord_clicked", { source: "banner_card", url: "..." })` when Discord link is clicked. |
| `src/pages/sys/login/register-form.tsx` | `trackEvent("user_registered", { username, email, ... })` after successful registration. |
| `src/pages/sys/others/posts.tsx` | `trackEvent("customEvent", { postModalOpened: "Post modal opened" })` when post modal opens. |
| `src/pages/sys/others/posts.tsx` | `trackEvent("customEvent", { postModalClosed: "Post modal closed" })` when post modal closes. |
| `src/layouts/components/search-bar.tsx` | `trackEvent("customEvent", { searchBarOpened: "Search bar opened" })` when search bar is opened. |
| `src/hooks/use-scroll-tracking.ts` | `trackEvent("page_scroll", { scrollPercent, page })` at scroll thresholds (25%, 50%, 75%, 100%). |

---

### 2.2 `identify(userId, traits?)`

| File | Usage |
|------|--------|
| `src/store/userStore.ts` | After sign-in: `identify(username, properties)` with user object (excluding password). Skipped when `username === "guest"`. |
| `src/pages/sys/login/register-form.tsx` | After registration: `identify(username, traits)` with registration fields. Skipped when `username === "guest"`. |

---

### 2.3 `openFeedbackById(feedbackConfigurationId)`

| File | Usage |
|------|--------|
| `src/pages/management/user/profile/index.tsx` | `openFeedbackById(ENCATCH_FEEDBACK_FORM_ID)` when feedback button is clicked (after `trackEvent("feedback_button_clicked", ...)`). |
| `src/pages/dashboard/workbench/index.tsx` | `openFeedbackById(ENCATCH_FEEDBACK_FORM_ID)` when feedback button is clicked (after `trackEvent("feedback_button_clicked", ...)`). |

`ENCATCH_FEEDBACK_FORM_ID` is defined in `src/lib/encatch.ts` (default: `"8c6893be-8189-4d03-bb73-e0488670fc4e"`).

---

### 2.4 `capturePageScrollEvent(scrollPercent)`

| File | Usage |
|------|--------|
| `src/layouts/dashboard/main.tsx` | On scroll: `capturePageScrollEvent(percent.toString())` (percent computed in layout). |
| `src/hooks/use-scroll-tracking.ts` | At thresholds 25, 50, 75, 100: `capturePageScrollEvent(\`${threshold}%\`)`. |

---

## 3. Configuration and setup

| Item | Location | Purpose |
|------|----------|---------|
| Encatch provider | `src/components/encatch-provider.tsx` | Calls `initEncatch()` on mount so `window.encatch` is available. |
| Init & adapter | `src/lib/encatch.ts` | `initEncatch()`, `createEncatchAdapter()`, `ENCATCH_FEEDBACK_FORM_ID`. |
| Global types | `src/global.d.ts` | `EncatchGlobal` and `Window.encatch` typings. |
| Vite proxy | `vite.config.ts` | Proxies `/engage-product/encatch/api`, `/engage-product/encatch`, `/s/sdk/v1` to `https://app.dev.encatch.com`. |
| Env example | `.env.example` | `VITE_ENCATCH_API_KEY`, `VITE_ENCATCH_API_BASE_URL`, `VITE_ENCATCH_FEEDBACK_FORM_ID`. |

---

## 4. Summary table (method → files)

| Method | Files |
|--------|--------|
| `trackEvent` | login-form.tsx (2), account-dropdown.tsx, profile/index.tsx, workbench/index.tsx, banner-card.tsx, register-form.tsx, posts.tsx (2), search-bar.tsx, use-scroll-tracking.ts |
| `identify` | userStore.ts, register-form.tsx |
| `openFeedbackById` | profile/index.tsx, workbench/index.tsx |
| `capturePageScrollEvent` | layouts/dashboard/main.tsx, use-scroll-tracking.ts |

---

*Last updated from codebase scan. Add new usages here when you add Encatch calls.*
