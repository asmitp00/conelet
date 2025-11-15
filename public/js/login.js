document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    function switchForm(formToShow) {
        if (!formLogin || !formRegister || !tabLogin || !tabRegister) {
            return;
        }

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

    if (tabLogin) {
        tabLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('login');
        });
    }

    if (tabRegister) {
        tabRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('register');
        });
    }

    // Check if we were redirected with a registration error
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'register') {
         switchForm('register');
    }
});
