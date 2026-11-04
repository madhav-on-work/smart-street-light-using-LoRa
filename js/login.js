/**
 * ============================================================
 * SMART STREET LIGHT
 * SUPABASE LOGIN CONTROLLER
 * ============================================================
 */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    'use strict';

    const form =
      document.getElementById('loginForm');

    const emailInput =
      document.getElementById('loginEmail');

    const passwordInput =
      document.getElementById('loginPassword');

    const errorBox =
      document.getElementById('loginError');

    const loginButton =
      document.getElementById('loginButton');


    // ----------------------------------------------------------
    // Basic DOM validation
    // ----------------------------------------------------------

    if (
      !form ||
      !emailInput ||
      !passwordInput ||
      !errorBox ||
      !loginButton
    ) {
      console.error(
        '[LOGIN] Required login elements are missing.'
      );

      return;
    }


    // ----------------------------------------------------------
    // Supabase validation
    // ----------------------------------------------------------

    if (!window.supabaseClient) {

      errorBox.textContent =
        'Authentication service is unavailable.';

      console.error(
        '[LOGIN] Supabase client not found.'
      );

      return;
    }


    // ----------------------------------------------------------
    // If already logged in, go to dashboard
    // ----------------------------------------------------------

    try {

      const {
        data,
        error
      } =
        await window.supabaseClient.auth.getSession();

      if (error) {
        console.error(
          '[LOGIN] Session check failed:',
          error
        );
      }

      if (data && data.session) {

        console.log(
          '[LOGIN] Existing session found.'
        );

        window.location.replace(
          './index.html'
        );

        return;
      }

    } catch (error) {

      console.error(
        '[LOGIN] Initial session check exception:',
        error
      );
    }


    // ----------------------------------------------------------
    // LOGIN FORM
    // ----------------------------------------------------------

    form.addEventListener(
      'submit',
      async (event) => {

        event.preventDefault();

        errorBox.textContent = '';

        const email =
          emailInput.value.trim();

        const password =
          passwordInput.value;


        // Basic validation
        if (!email || !password) {

          errorBox.textContent =
            'Please enter your email and password.';

          return;
        }


        // Lock button during authentication
        loginButton.disabled = true;

        loginButton.textContent =
          'AUTHENTICATING...';


        try {

          const {
            data,
            error
          } =
            await window.supabaseClient.auth
              .signInWithPassword({
                email: email,
                password: password
              });


          // ----------------------------------------------------
          // Login failed
          // ----------------------------------------------------

          if (error) {

            console.error(
              '[LOGIN] Supabase login failed:',
              error
            );

            errorBox.textContent =
              getLoginErrorMessage(error);

            loginButton.disabled = false;

            loginButton.textContent =
              'LOGIN';

            return;
          }


          // ----------------------------------------------------
          // Login successful
          // ----------------------------------------------------

          if (!data || !data.session) {

            console.error(
              '[LOGIN] Login returned no active session.'
            );

            errorBox.textContent =
              'Login succeeded but no session was created.';

            loginButton.disabled = false;

            loginButton.textContent =
              'LOGIN';

            return;
          }


          console.log(
            '[LOGIN] Authentication successful:',
            data.user?.email
          );


          // Redirect to protected dashboard
          window.location.replace(
            './index.html'
          );

        } catch (error) {

          console.error(
            '[LOGIN] Unexpected authentication error:',
            error
          );

          errorBox.textContent =
            getLoginErrorMessage(error);

          loginButton.disabled = false;

          loginButton.textContent =
            'LOGIN';
        }

      }
    );


    // ----------------------------------------------------------
    // Convert Supabase errors into user-friendly messages
    // ----------------------------------------------------------

    function getLoginErrorMessage(error) {

      const message =
        String(error?.message || '').toLowerCase();


      if (
        message.includes('invalid login credentials')
      ) {
        return 'Invalid email or password.';
      }


      if (
        message.includes('invalid api key') ||
        message.includes('invalid api') ||
        message.includes('apikey')
      ) {
        return 'Supabase configuration error. Check the project URL and publishable key in js/supabase.js.';
      }


      if (
        message.includes('email not confirmed')
      ) {
        return 'Please confirm your email before logging in.';
      }


      if (
        message.includes('too many requests')
      ) {
        return 'Too many login attempts. Please try again later.';
      }


      if (
        message.includes('network')
      ) {
        return 'Could not reach Supabase. Open this page through http://localhost:8000 (not file://) and check your internet connection.';
      }


      if (
        message.includes('failed to fetch') ||
        message.includes('fetch failed') ||
        message.includes('cors')
      ) {
        return 'Could not reach Supabase from this page. Serve it from http://localhost:8000 and check your internet connection and project URL.';
      }


      return (
        error?.message ||
        'Login failed. Please try again.'
      );
    }

  }
);
