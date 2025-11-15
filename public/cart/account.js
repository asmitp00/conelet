document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    function switchForm(formToShow) {
        if (formToShow === 'login') {
            formLogin.style.display = 'block';
            formRegister.style.display = 'none';
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
        } else {
            formLogin.style.display = 'none';
            formRegister.style.display = 'block';
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');
        }
    }

    // Event listeners to switch forms
    if (tabLogin) tabLogin.addEventListener('click', () => switchForm('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchForm('register'));

    // Check URL query parameters to show the register form if redirected with an error
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'register') {
         switchForm('register');
    }
});
