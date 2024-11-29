document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.createElement('p');
    errorMessage.className = 'error-message';
    errorMessage.style.display = 'none';
    errorMessage.style.color = 'red';
    loginForm.appendChild(errorMessage);

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const email = document.getElementById('email-address').value;
        const password = document.getElementById('password').value;

        console.log('Attempting login with:', email, 'Password:', password);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok) {
                console.log('Login successful');
                window.location.href = '/index';
            } else {
                console.log('Login failed:', data.error);
                errorMessage.textContent = data.error || 'Login fehlgeschlagen';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Ein Fehler ist aufgetreten';
            errorMessage.style.display = 'block';
        }
    });

    // Passwort anzeigen/verbergen Funktionalität
    const passwordToggle = document.querySelector('.password-toggle');
    const passwordInput = document.getElementById('password');

    passwordToggle.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('show-password');
    });
});