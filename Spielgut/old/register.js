document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (data.password !== data['password-repeat']) {
      alert('Passwörter stimmen nicht überein');
      return;
    }
  
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Registrierung erfolgreich');
        window.location.href = '/login';
      } else {
        const errorText = await response.text();
        alert(`Registrierung fehlgeschlagen: ${errorText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Bei der Registrierung ist ein Fehler aufgetreten');
    }
  });
