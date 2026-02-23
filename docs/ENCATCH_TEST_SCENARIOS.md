# Encatch SDK – UI test scenarios

Manual, user-perspective test scenarios for the Encatch test page (`/dashboard/encatch-test`). Encatch must be initialized (e.g. via EncatchProvider) before running these.

---

## Scenarios overview


| #   | Scenario                      | User goal                                   | Section on test page              |
| --- | ----------------------------- | ------------------------------------------- | --------------------------------- |
| 1   | Identify then open form       | Submit feedback as a known user             | identifyUser, showForm            |
| 2   | Anonymous user opens form     | Open feedback without identifying           | showForm (no identify)            |
| 3   | Prefill then open form        | Form opens with some answers already filled | addToResponse, showForm           |
| 4   | Reset mode: always            | Form is empty every time it opens           | showForm (reset = always)         |
| 5   | Reset mode: never             | Re-opening keeps previous answers           | showForm (reset = never)          |
| 6   | Reset mode: on-complete       | Data clears only after form was completed   | showForm (reset = on-complete)    |
| 7   | Theme (light / dark / system) | Form matches chosen theme                   | setTheme, showForm                |
| 8   | Locale and country            | Form uses set locale/country                | setLocale, setCountry, showForm   |
| 9   | Session and screen tracking   | Session starts and screens are tracked      | startSession, trackScreen         |
| 10  | Logout flow (reset user)      | After “logout”, user is anonymous           | identifyUser, resetUser           |
| 11  | Event log – form lifecycle    | See form events in the UI                   | on (event log), showForm          |
| 12  | Track custom event            | Custom event is sent (and may trigger form) | trackEvent                        |
| 13  | Prefill while form is open    | addToResponse updates already-open form     | addToResponse, showForm           |
| 14  | Multiple identify then reset  | Switch from one user to another             | identifyUser, resetUser, showForm |
| 15  | Invalid form ID               | Graceful handling when form cannot load     | showForm (invalid ID)             |


---

## Steps and expected results (by scenario)

### 1. Identify then open form (logged-in user)


| Step | Action                                                                                                 | Expected result                                                |
| ---- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 1    | In **identifyUser**, set User ID (e.g. `alice_001`) and traits (email, name). Click **Identify user**. | Success message; user context set.                             |
| 2    | In **showForm**, set form ID, reset **always**. Click **Open form**.                                   | Form opens in modal/iframe.                                    |
| 3    | Check event log.                                                                                       | `form:show`, then `form:started` (and others as you interact). |
| 4    | Submit form.                                                                                           | Backend receives response associated with `alice_001`.         |


---

### 2. Anonymous user opens form


| Step | Action                                                    | Expected result                                   |
| ---- | --------------------------------------------------------- | ------------------------------------------------- |
| 1    | Do **not** call Identify (or click **Reset user** first). | No user ID set.                                   |
| 2    | Click **Open form**.                                      | Form opens and can be filled.                     |
| 3    | Check event log.                                          | Events appear (e.g. `form:show`, `form:started`). |
| 4    | Submit.                                                   | Response stored as anonymous/session context.     |


---

### 3. Prefill then open form


| Step | Action                                                                                         | Expected result                          |
| ---- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | In **addToResponse**, set **Question ID** to a real question ID from your form (e.g. `email`). | —                                        |
| 2    | Set **Value** (e.g. `prefilled@example.com`). Click **Add to response**.                       | Success message.                         |
| 3    | Click **Open form**.                                                                           | Form opens.                              |
| 4    | Check the matching question in the form.                                                       | That question shows the prefilled value. |


---

### 4. Reset mode: always (default)


| Step | Action                                                                      | Expected result                                            |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Set **Reset mode** to **always**.                                           | —                                                          |
| 2    | Click **Open form**, fill one or two questions (do not submit), close form. | Form closes.                                               |
| 3    | Click **Open form** again.                                                  | Form opens with **no** previous answers; all fields empty. |


---

### 5. Reset mode: never (preserve answers)


| Step | Action                                              | Expected result                                |
| ---- | --------------------------------------------------- | ---------------------------------------------- |
| 1    | Set **Reset mode** to **never**.                    | —                                              |
| 2    | Click **Open form**, fill some answers, close form. | Form closes.                                   |
| 3    | Click **Open form** again.                          | Form opens with **same** answers still filled. |


---

### 6. Reset mode: on-complete


| Step | Action                                                        | Expected result                             |
| ---- | ------------------------------------------------------------- | ------------------------------------------- |
| 1    | Set **Reset mode** to **on-complete**.                        | —                                           |
| 2    | **Part A:** Open form, fill **partially**, close. Open again. | Previous partial answers are **preserved**. |
| 3    | **Part B:** Open form, **complete and submit**. Open again.   | Form is **empty** (cleared after complete). |


---

### 7. Theme (light / dark / system)


| Step | Action                                        | Expected result                                  |
| ---- | --------------------------------------------- | ------------------------------------------------ |
| 1    | Click **Light** (or **Dark**, or **System**). | Theme set.                                       |
| 2    | Click **Open form**.                          | Form (and modal/overlay) use the selected theme. |
| 3    | With **System**.                              | Form follows OS/browser light/dark preference.   |


---

### 8. Locale and country


| Step | Action                                                                        | Expected result                                                             |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | In **setLocale**, set language (e.g. `en`, `de`, `fr`). Click **Set locale**. | Success message.                                                            |
| 2    | In **setCountry**, set country (e.g. `US`, `DE`). Click **Set country**.      | Success message.                                                            |
| 3    | Click **Open form**.                                                          | Form content (labels, placeholders) matches locale/country where supported. |


---

### 9. Session and screen tracking


| Step | Action                                                                            | Expected result                                          |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | Click **Start session**.                                                          | Message that session started (ping + URL tracking).      |
| 2    | In **trackScreen**, enter screen name (e.g. `/checkout`). Click **Track screen**. | Success message.                                         |
| 3    | Navigate to another route and back (or change screen name and track again).       | No errors; network shows ping/track-screen requests.     |
| 4    | (If URL tracking is on)                                                           | Navigating triggers automatic `trackScreen` for new URL. |


---

### 10. Logout flow (reset user)


| Step | Action                                                                | Expected result                                           |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | **Identify user** with a user ID. Optionally click **Start session**. | User and session set.                                     |
| 2    | Click **Reset user**.                                                 | Message e.g. “User reset (anonymous; session cleared)”.   |
| 3    | Open form or fire track event.                                        | Behavior is for anonymous user; no previous user context. |


---

### 11. Event log – form lifecycle


| Step | Action                                                                  | Expected result                                           |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | Ensure **on (event subscription)** event log is visible at top of page. | Log visible (empty or with prior events).                 |
| 2    | Click **Open form**.                                                    | `form:show` (and typically `form:started`) in log.        |
| 3    | Answer a question or change section.                                    | `form:question:answered` or `form:section:change` in log. |
| 4    | Submit form.                                                            | `form:submit`, `form:complete` in log.                    |
| 5    | Or close without submitting.                                            | `form:close` or `form:dismissed` in log.                  |


---

### 12. Track custom event


| Step | Action                                                                | Expected result                                           |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | In **trackEvent**, enter event name (e.g. `feedback_button_clicked`). | —                                                         |
| 2    | Click **Fire track event**.                                           | Success message.                                          |
| 3    | Check network tab.                                                    | Request to track-event API.                               |
| 4    | (If project auto-shows form on this event)                            | Form may open automatically; event log shows `form:show`. |


---

### 13. Prefill while form is already open


| Step | Action                                                                                                    | Expected result                                                      |
| ---- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | Click **Open form** (form visible).                                                                       | Form is open.                                                        |
| 2    | In **addToResponse**, set **Question ID** (exists in open form) and **Value**. Click **Add to response**. | Success message.                                                     |
| 3    | Check the open form.                                                                                      | That question shows the new value (if engine supports live prefill). |


---

### 14. Multiple identify then reset


| Step | Action                                                                          | Expected result                                  |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1    | **Identify user** as `user_A`. Click **Identify user**. Open form, fill, close. | Responses tied to `user_A`.                      |
| 2    | Click **Reset user**.                                                           | User cleared.                                    |
| 3    | **Identify user** as `user_B`. Click **Identify user**.                         | User context is `user_B`.                        |
| 4    | Click **Open form**, fill, submit.                                              | Response associated with `user_B`, not `user_A`. |


---

### 15. Invalid form ID


| Step | Action                                                                                        | Expected result                                                                             |
| ---- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | In **showForm**, set Form configuration ID to invalid/non-existent (e.g. `invalid-id-12345`). | —                                                                                           |
| 2    | Click **Open form**.                                                                          | Error message on page or `form:error` in event log; no broken modal; no uncaught exception. |


