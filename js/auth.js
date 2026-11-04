/**
 * ============================================================
 * SMART STREET LIGHT DASHBOARD
 * SUPABASE AUTHENTICATION GUARD
 * ============================================================
 *
 * Responsibilities:
 * 1. Verify an active Supabase session.
 * 2. Prevent unauthorized access to index.html.
 * 3. Provide a single logout function.
 * 4. Redirect unauthenticated users to login.html.
 */

(function () {
  'use strict';

  /**
   * Check whether the user has an active Supabase session.
   */
  async function requireAuthentication() {

    // Supabase client must already exist.
    if (!window.supabaseClient) {
      console.error(
        '[AUTH] Supabase client is not available.'
      );

      window.location.replace('./login.html');
      return false;
    }

    try {

      const {
        data,
        error
      } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.error(
          '[AUTH] Session check failed:',
          error
        );

        window.location.replace('./login.html');
        return false;
      }

      // No active session.
      if (!data || !data.session) {
        console.warn(
          '[AUTH] No active session. Redirecting to login.'
        );

        window.location.replace('./login.html');
        return false;
      }

      console.log(
        '[AUTH] Authenticated:',
        data.session.user.email
      );

      return true;

    } catch (error) {

      console.error(
        '[AUTH] Authentication check exception:',
        error
      );

      window.location.replace('./login.html');
      return false;
    }
  }


  /**
   * Logout the current Supabase user.
   */
  async function logoutDashboard() {

    const logoutButton =
      document.getElementById('btnLogout');

    if (logoutButton) {
      logoutButton.disabled = true;
      logoutButton.textContent = 'LOGGING OUT...';
    }

    try {

      if (!window.supabaseClient) {
        console.error(
          '[AUTH] Supabase client unavailable during logout.'
        );

        window.location.replace('./login.html');
        return;
      }

      const {
        error
      } = await window.supabaseClient.auth.signOut();

      if (error) {
        console.error(
          '[AUTH] Logout failed:',
          error
        );

        if (logoutButton) {
          logoutButton.disabled = false;
          logoutButton.textContent = 'LOGOUT';
        }

        alert(
          'Logout failed. Please try again.'
        );

        return;
      }

      console.log(
        '[AUTH] Logout successful.'
      );

      // Replace prevents browser Back from simply restoring dashboard.
      window.location.replace('./login.html');

    } catch (error) {

      console.error(
        '[AUTH] Logout exception:',
        error
      );

      if (logoutButton) {
        logoutButton.disabled = false;
        logoutButton.textContent = 'LOGOUT';
      }

      alert(
        'Unable to logout. Please try again.'
      );
    }
  }


  // Make functions globally available.
  window.requireAuthentication =
    requireAuthentication;

  window.logoutDashboard =
    logoutDashboard;

})();