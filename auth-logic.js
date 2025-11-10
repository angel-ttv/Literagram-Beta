// auth-logic.js

// =========================================================
// 1. CONFIGURACIÓN DE FIREBASE (¡REEMPLAZA TUS CLAVES!)
// =========================================================
const firebaseConfig = {
    // 🔑 REEMPLAZA ESTO CON TUS CLAVES REALES DE FIREBASE
    apiKey: "AIzaSyABxlIRqMHIVjxpPjEgQhhY40itnEOXHe4", 
    authDomain: "literagramapp.firebaseapp.com",
    projectId: "literagramapp",
    storageBucket: "literagramapp.firebasestorage.app",
    messagingSenderId: "921030234359",
    appId: "1:921030234359:web:07c46178278542e55443f2",
    // Agrega aquí cualquier otra clave que tengas
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Objetos de Firebase
const db = firebase.firestore();
const auth = firebase.auth(); 

// Colección de perfiles de usuario
const usersCollection = db.collection("users"); 

// Dominio simulado para convertir el username en un email válido para Firebase Auth
const EMAIL_DOMAIN = "@literagram.com";


// =========================================================
// 2. UTILIDAD: ASIGNAR ID DE USUARIO Y CREAR PERFIL
// =========================================================

/** * Cuenta el total de documentos en la colección de usuarios para asignar un ID secuencial. */
async function getNewUserId() {
    try {
        const snapshot = await usersCollection.get();
        return snapshot.size + 1;
    } catch (e) {
        console.error("Error al contar usuarios para asignar ID:", e);
        return -1;
    }
}

/** Utilidad para crear o actualizar el perfil del usuario en Firestore. */
async function createOrUpdateProfile(uid, username, nombre, provider, email = null, userId = null) {
    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        // Si el perfil no existe en Firestore, lo crea
        const newUserProfile = {
            uid: uid,
            username: username,
            nombre: nombre, 
            bio: "¡Hola! Nuevo escritor en Literagram.", // Biografía inicial limpia
            seguidores: 0,
            siguiendo: 0,
            avatarInicial: nombre.charAt(0).toUpperCase(),
            provider: provider,
            email: email, 
            nombreCompleto: nombre, 
            userId: userId 
        };
        await userRef.set(newUserProfile);
        return newUserProfile;
    }
    // Si ya existe, retorna los datos existentes
    return doc.data();
}


// =========================================================
// 3. RENDERING Y LÓGICA DE VISTAS DE AUTH
// =========================================================

function renderAuthPage(isLogin = true) {
    const container = document.getElementById('view-auth');
    const authAction = isLogin ? 'Inicia Sesión' : 'Regístrate';
    
    const formContent = isLogin ? `
        <p>Únete a la comunidad de escritores. Si no tienes una cuenta, el registro es rápido.</p>
        
        <button type="button" class="auth-btn google-btn" onclick="window.signInWithGoogle()">
            <i class="fab fa-google"></i> Iniciar sesión con Google
        </button>
        <hr style="margin: 20px 0; border-color: var(--color-borde);">
        
        <input type="text" id="auth-username" placeholder="Nombre de usuario" required>
        <input type="password" id="auth-password" placeholder="Contraseña" required>
        <button type="submit" class="auth-btn">Iniciar Sesión</button>
        <p class="auth-toggle-link" onclick="renderAuthPage(false)">¿No tienes cuenta? Regístrate</p>
    ` : `
        <p>Crea tu perfil de escritor. (Usaremos tu nombre de usuario + ${EMAIL_DOMAIN} como email de registro)</p>
        <input type="text" id="reg-nombre" placeholder="Nombre completo" required>
        <input type="text" id="reg-username" placeholder="Nombre de usuario" required>
        <input type="password" id="reg-password" placeholder="Contraseña" required>
        <button type="submit" class="auth-btn">Crear Cuenta</button>
        <p class="auth-toggle-link" onclick="renderAuthPage(true)">¿Ya tienes cuenta? Inicia Sesión</p>
    `;

    container.innerHTML = `<div class="auth-form-card"><h2>${authAction} en Literagram</h2><form id="auth-form">${formContent}</form></div>`;
    
    const form = document.getElementById('auth-form');
    form.removeEventListener('submit', handleAuthSubmit);
    form.addEventListener('submit', handleAuthSubmit);
}


// =========================================================
// 4. LÓGICA DE AUTHENTICACIÓN SEGURA Y PERSISTENCIA
// =========================================================

/** Inicia sesión usando la ventana emergente de Google. */
window.signInWithGoogle = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const username = user.email.split('@')[0];

        const newUserId = await getNewUserId();

        // 1. Crear/Actualizar perfil en Firestore
        const profileData = await createOrUpdateProfile(user.uid, username, user.displayName, 'Google', user.email, newUserId);

        // 2. Guardar perfil en localStorage y redirigir
        localStorage.setItem('currentUserData', JSON.stringify(profileData));
        alert("¡Google Login Exitoso!");
        window.location.href = 'index.html';

    } catch (error) {
        alert(`Error de Google Sign-In: ${error.message}`);
        console.error("Error de Google Auth:", error);
    }
}

/** Maneja el envío del formulario de Email/Contraseña. */
async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('auth-form');
    const isLogin = form.querySelector('button.auth-btn').textContent === 'Iniciar Sesión';

    const usernameInput = document.getElementById(isLogin ? 'auth-username' : 'reg-username').value;
    const passwordInput = document.getElementById(isLogin ? 'auth-password' : 'reg-password').value;
    const email = usernameInput + EMAIL_DOMAIN;
    
    try {
        let userCredential = null;
        let isRegistration = false;

        if (isLogin) {
            // LOGIN EMAIL/PASSWORD
            userCredential = await auth.signInWithEmailAndPassword(email, passwordInput);
        } else {
            // REGISTRO EMAIL/PASSWORD (Verificaciones)
            isRegistration = true;
            const checkQuery = await usersCollection.where("username", "==", usernameInput).get();
            if (!checkQuery.empty) { throw new Error("El nombre de usuario ya existe."); }
            
            userCredential = await auth.createUserWithEmailAndPassword(email, passwordInput);
        }

        // --- MANEJO DEL PERFIL DESPUÉS DE AUTENTICACIÓN EXITOSA ---
        const user = userCredential.user || auth.currentUser;
        const newNombre = isRegistration ? document.getElementById('reg-nombre').value : user.displayName || usernameInput;
        const newUserId = await getNewUserId();

        // 1. Crea o actualiza el perfil en Firestore
        const profileData = await createOrUpdateProfile(user.uid, usernameInput, newNombre, 'Email/Password', user.email, newUserId);
        
        // 2. Guardar perfil en localStorage y redirigir
        localStorage.setItem('currentUserData', JSON.stringify(profileData));
        
        if (isRegistration) {
             alert(`¡Cuenta creada para ${newNombre}! Iniciando sesión.`);
        } else {
             alert("¡Login Exitoso! Redirigiendo a la aplicación principal.");
        }
        
        window.location.href = 'index.html'; // REDIRECCIÓN FINAL EXITOSA

    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') errorMessage = 'Usuario no encontrado. Regístrate primero.';
        if (error.code === 'auth/wrong-password') errorMessage = 'Contraseña incorrecta.';
        
        alert(`Error de Autenticación: ${errorMessage}`);
        console.error("Error de Autenticación:", error);
    }
}


// =========================================================
// 5. INICIALIZACIÓN DE LA PÁGINA
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Si ya está logueado, redirigir al index
    if (localStorage.getItem('currentUserData')) {
        window.location.href = 'index.html';
        return;
    }
    
    // Renderizar el Login
    renderAuthPage(true); 
});