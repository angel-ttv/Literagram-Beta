// =========================================================
// 1. ESTADO GLOBAL Y DATOS DE LA APLICACIÓN (localStorage)
// =========================================================

let currentUser = {
    username: null,
    nombreCompleto: "Invitado",
    bio: "Inicia sesión para compartir tu arte.",
    seguidores: 0,
    siguiendo: 0,
    avatarInicial: "I"
};

let posts = []; 
let users = []; 

const initialPosts = [
    { id: 'p1', autor: "testuser", tipo: "Poema", titulo: "El Silencio de las Hojas", contenido: "El silencio de las hojas...\n#poesia #naturaleza", likes: 235, comentarios: 0, fecha: new Date(Date.now() - 86400000).toISOString(), tags: ["poesia", "naturaleza"] },
    { id: 'p2', autor: "Aurora_Boreal", tipo: "Fragmento de Novela", titulo: "Capítulo I: La Esquina", contenido: "Y fue en esa esquina, bañada por la luz cansada de un farol...\n#novela #literaturaurbana", likes: 98, comentarios: 15, fecha: new Date().toISOString(), tags: ["novela", "literaturaurbana"] }
];


// =========================================================
// 2. PERSISTENCIA Y UTILIDADES
// =========================================================

function loadData() {
    // 1. Carga de Posts (de prueba o guardados)
    const storedPosts = localStorage.getItem('literagramPosts');
    posts = storedPosts ? JSON.parse(storedPosts) : initialPosts;
    
    // 2. Carga de Perfil (CLAVE: Lo que auth-logic.js guardó)
    const storedUserData = localStorage.getItem('currentUserData'); 
    if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        currentUser = userData; 
    }
}

function savePosts() {
    localStorage.setItem('literagramPosts', JSON.stringify(posts));
}

function updateSidebarProfile() {
    const sidebar = document.querySelector('.sidebar .profile-card');
    if (sidebar) {
        sidebar.querySelector('.profile-avatar').textContent = currentUser.avatarInicial;
        sidebar.querySelector('h3').textContent = currentUser.username || "Invitado";
        sidebar.querySelector('p').textContent = currentUser.bio;
        
        const postCount = posts.filter(p => p.autor === currentUser.username).length;
        document.getElementById('sidebar-posts').textContent = postCount + " Publicaciones";
        document.getElementById('sidebar-followers').textContent = currentUser.seguidores + " Seguidores";
    }
}

function extractTags(text) {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return matches.map(tag => tag.substring(1).toLowerCase());
}


// =========================================================
// 3. GENERACIÓN DE HTML Y LÓGICA DE INTERACCIÓN
// =========================================================

function createPostCardHTML(post) {
    const tagsHTML = post.tags ? post.tags.map(tag => 
        `<a href="#" class="tag-link" onclick="window.searchByTag('${tag}')">#${tag}</a>`
    ).join(' ') : '';

    const isCurrentUserAuthor = currentUser.username === post.autor;
    
    const controlButtons = isCurrentUserAuthor ? 
        `<button class="action-btn edit-btn" onclick="window.startEditPost('${post.id}')">
            <i class="fas fa-edit"></i> Editar
        </button>
        <button class="action-btn delete-btn" onclick="window.deletePost('${post.id}')">
            <i class="fas fa-trash"></i> Eliminar
        </button>` : '';
    
    let displayDate = post.fecha;
    try {
        const dateObj = new Date(post.fecha);
        displayDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { /* Usa la fecha cruda si falla */ }

    return `
        <article class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <span class="post-author">@${post.autor}</span>
                <span class="post-date">Publicado: ${displayDate || 'ahora'}</span>
            </div>
            <div class="post-content">
                <h3>${post.titulo} <span class="post-type">(${post.tipo})</span></h3>
                <p>${post.contenido}</p>
                <div class="post-tags">${tagsHTML}</div>
            </div>
            <div class="post-actions">
                ${controlButtons} 
                <button class="action-btn like-btn" data-post-id="${post.id}">
                    <i class="fas fa-heart"></i> <span>${post.likes || 0}</span>
                </button>
                <button class="action-btn comment-btn" onclick="window.toggleComments('${post.id}')">
                    <i class="fas fa-comment"></i> <span>${post.comentarios || 0}</span>
                </button>
            </div>

            <div class="comments-section" id="comments-${post.id}">
                <h4>Comentarios (Simulación):</h4>
                <form class="comment-form" onsubmit="window.handleCommentSubmit(event, '${post.id}')">
                    <input type="text" placeholder="Escribe un comentario..." required>
                    <button type="submit">Enviar</button>
                </form>
                
                <div class="comments-list" id="comments-list-${post.id}">
                    <p class="comment-item"><strong>@Simulador</strong>: ¡Me encantó esta parte!</p>
                </div>
            </div>
        </article>
    `;
}

function addActionListener() {
    const likeButtons = document.querySelectorAll('.like-btn');
    likeButtons.forEach(button => {
        button.removeEventListener('click', handleLikeClick);
        button.addEventListener('click', handleLikeClick);
    });
}

// LÓGICA DE LIKES
async function handleLikeClick(e) {
    const button = e.currentTarget;
    const postId = button.dataset.postId; 
    const icon = button.querySelector('i.fa-heart');
    const likesSpan = button.querySelector('span');
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1 || !postId) return;

    const isLiked = icon.classList.contains('liked');
    const newLikes = isLiked ? posts[postIndex].likes - 1 : posts[postIndex].likes + 1;
    
    posts[postIndex].likes = newLikes;
    likesSpan.textContent = newLikes;
    icon.classList.toggle('liked');

    savePosts();
}

// LÓGICA DE EDICIÓN Y ELIMINACIÓN
window.deletePost = function(postId) {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente esta publicación?")) {
        return; 
    }

    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex > -1) {
        posts.splice(postIndex, 1); 
        savePosts();
        alert("Publicación eliminada correctamente.");
        const activeView = document.querySelector('.page-view.active');
        if (activeView) { navigateTo(activeView.id); }
    }
};

window.startEditPost = function(postId) {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = posts[postIndex];
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    
    if (!postCard) return;

    postCard.innerHTML = `
        <section class="new-post-box" style="border-left: none; box-shadow: none;">
            <h3>Editando: ${post.titulo}</h3>
            <form id="edit-form-${postId}" onsubmit="window.saveEditedPost(event, '${postId}')">
                <input type="text" id="edit-title-${postId}" value="${post.titulo}" placeholder="Título de tu obra..." required>
                
                <p style="margin-bottom: 15px;">Tipo de Obra: <strong>${post.tipo}</strong></p>
                
                <textarea id="edit-content-${postId}" rows="8" placeholder="Escribe tu contenido aquí..." required>${post.contenido}</textarea>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="action-btn" onclick="window.cancelEditPost('${postId}')">Cancelar</button>
                    <button type="submit" class="publish-btn" style="width: auto; padding: 8px 15px;">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </form>
        </section>
    `;
};

window.cancelEditPost = function(postId) {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = posts[postIndex];
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    
    postCard.outerHTML = createPostCardHTML(post); 
    addActionListener(); 
};

window.saveEditedPost = function(event, postId) {
    event.preventDefault();
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const newTitle = document.getElementById(`edit-title-${postId}`).value;
    const newContent = document.getElementById(`edit-content-${postId}`).value;
    const newTags = extractTags(newContent); 

    posts[postIndex].titulo = newTitle;
    posts[postIndex].contenido = newContent;
    posts[postIndex].tags = newTags;
    posts[postIndex].fecha = new Date().toISOString(); 

    savePosts();

    alert("¡Publicación actualizada con éxito!");

    const activeView = document.querySelector('.page-view.active');
    if (activeView) { navigateTo(activeView.id); }
};

window.toggleComments = function(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;

    if (commentsSection.style.display === 'block') {
        commentsSection.style.display = 'none';
    } else {
        commentsSection.style.display = 'block';
    }
}

window.handleCommentSubmit = function(event, postId) {
    event.preventDefault();
    if (!currentUser.username) { alert("Debes iniciar sesión para comentar."); return; }

    const input = event.target.querySelector('input');
    const commentText = input.value;
    
    alert(`Comentario de @${currentUser.username} ("${commentText}") registrado localmente. (Simulación)`);
    input.value = '';
}

async function addNewPost(event) {
    event.preventDefault(); 
    if (!currentUser.username) { alert("Debes iniciar sesión para publicar."); return; }

    const title = document.getElementById('post-title').value;
    const type = document.getElementById('post-type').value;
    const content = document.getElementById('post-content').value;
    const tags = extractTags(content);

    const newPostData = {
        id: Date.now().toString(),
        autor: currentUser.username, 
        tipo: type,
        titulo: title,
        contenido: content,
        likes: 0,
        comentarios: 0,
        fecha: new Date().toISOString(), 
        tags: tags
    };

    posts.push(newPostData);
    savePosts();

    document.getElementById('new-post-form').reset();
    await loadData();
    navigateTo('view-feed');
}


// =========================================================
// 4. RENDERS DE PÁGINAS Y NAVEGACIÓN
// =========================================================

function navigateTo(viewId) {
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        
        if (viewId === 'view-feed') renderFeedPage();
        else if (viewId === 'view-profile') renderProfilePage(); 
        else if (viewId === 'view-create') renderCreatePage();
        else if (viewId === 'view-search') renderSearchPage();
    }
}

function renderFeedPage() {
    const container = document.getElementById('view-feed');
    container.innerHTML = `
        <section id="create-box-in-feed" class="new-post-box">
            <h3>¿Qué escribes hoy, @${currentUser.username || 'Invitado'}?</h3>
            ${currentUser.username ? 
                `<button class="publish-btn" onclick="navigateTo('view-create')">
                    <i class="fas fa-feather-alt"></i> Publicar nueva obra
                </button>` :
                `<p style="color:var(--color-principal); font-style:italic;">Debes iniciar sesión para publicar.</p>`
            }
        </section>
        
        <section class="feed-controls">
            <label for="post-filter">Mostrar:</label>
            <select id="post-filter" onchange="window.filterFeed(this.value)">
                <option value="todos">Todos los Tipos de Obra</option>
                <option value="Poema">Poemas</option>
                <option value="Cita">Citas o Frases</option>
                <option value="Fragmento de Novela">Fragmentos de Novela</option>
            </select>
        </section>

        <div id="feed-list" class="posts-list-container"><h2>Publicaciones Recientes</h2></div>
    `;
    window.filterFeed('todos'); 
}

function renderProfilePage() {
    const container = document.getElementById('view-profile');
    if (!currentUser.username) { container.innerHTML = `<p style="padding: 30px;">Debes iniciar sesión para ver tu perfil.</p>`; return; }
    
    const userPosts = posts.filter(p => p.autor === currentUser.username);
    const postCount = userPosts.length;
    
    // LÓGICA DEL CONTADOR DE PRIMER USUARIO
    const isFirstUser = currentUser.userId === 1;

    // Etiqueta especial que se muestra solo si es el primer usuario
    const firstUserTag = isFirstUser ? 
        `<span style="color: gold; font-weight: bold; margin-left: 15px; background: rgba(255, 215, 0, 0.1); padding: 2px 8px; border-radius: 4px;">⭐ Primer Usuario de Literagram</span>` 
        : '';
    
    container.innerHTML = `
        <div class="profile-header-container">
            <div class="profile-main-info"><div class="profile-avatar large">${currentUser.avatarInicial}</div><div class="profile-text">
                <h2>${currentUser.nombreCompleto} ${firstUserTag}</h2> 
                <h3>@${currentUser.username}</h3>
                <p class="profile-bio">${currentUser.bio}</p>
            </div></div>
            <div class="profile-stats"><div><span>${postCount}</span> Publicaciones</div><div><span>${currentUser.seguidores}</span> Seguidores</div><div><span>${currentUser.siguiendo}</span> Siguiendo</div></div>
        </div>
        <div id="profile-posts-list" class="posts-list-container"><h3>Mis Obras Publicadas (${postCount})</h3></div>
    `;

    const postsListDiv = document.getElementById('profile-posts-list');
    let postsHTML = '';
    [...userPosts].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(post => { postsHTML += createPostCardHTML(post); });
    postsListDiv.innerHTML += postsHTML;
    addActionListener(); 
}

function renderCreatePage() {
    const container = document.getElementById('view-create');
    if (!currentUser.username) { container.innerHTML = `<p style="padding: 30px;">Debes iniciar sesión para crear una publicación.</p>`; return; }

    container.innerHTML = `
        <section class="new-post-box">
            <h3>Crea una nueva obra y usa #hashtags</h3>
            <form id="new-post-form">
                <input type="text" id="post-title" placeholder="Título de tu obra..." required>
                <select id="post-type" required><option value="" disabled selected>Selecciona el tipo de obra...</option><option value="Poema">Poema</option><option value="Cita">Cita o Frase</option><option value="Fragmento de Novela">Fragmento de Novela</option></select>
                <textarea id="post-content" rows="8" placeholder="Escribe tu contenido aquí. Usa #palabra para crear hashtags." required></textarea>
                <button type="submit" class="publish-btn"><i class="fas fa-feather-alt"></i> Publicar Obra</button>
            </form>
        </section>
    `;

    const form = document.getElementById('new-post-form');
    form.removeEventListener('submit', addNewPost);
    form.addEventListener('submit', addNewPost);
}

function renderSearchPage() {
    const container = document.getElementById('view-search');
    container.innerHTML = `
        <section class="search-box new-post-box">
            <h3>Buscar Obras por #Hashtag o Título</h3>
            <form id="search-form"><input type="text" id="search-term" placeholder="Escribe un #hashtag o palabra clave..." required><button type="submit" class="publish-btn"><i class="fas fa-search"></i> Buscar</button></form>
        </section>
        <div id="search-results-list" class="posts-list-container"><h2>Resultados de Búsqueda</h2></div>
    `;

    const form = document.getElementById('search-form');
    form.removeEventListener('submit', handleSearch);
    form.addEventListener('submit', handleSearch);
}

window.filterFeed = function(type) {
    const postsListDiv = document.getElementById('feed-list');
    if (!postsListDiv) return;

    let filteredPosts = posts;
    if (type !== 'todos') {
        filteredPosts = posts.filter(post => post.tipo === type);
    }

    let postsHTML = `<h2>Publicaciones Recientes (${type === 'todos' ? 'Todos' : type})</h2>`;
    
    if (filteredPosts.length === 0) {
        postsHTML += '<p style="padding: 20px; text-align: center;">No hay publicaciones de este tipo.</p>';
    } else {
        [...filteredPosts].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(post => { postsHTML += createPostCardHTML(post); });
    }

    postsListDiv.innerHTML = postsHTML;
    addActionListener(); 
}

window.searchByTag = function(tag) { 
    navigateTo('view-search'); 
    setTimeout(() => {
        const input = document.getElementById('search-term');
        if (input) {
            const fullTerm = `#${tag}`;
            input.value = fullTerm;
            const resultsDiv = document.getElementById('search-results-list');
            if(resultsDiv) executeSearchLogic(fullTerm);
        }
    }, 50); 
}

function handleSearch(event) {
    event.preventDefault();
    const searchTerm = document.getElementById('search-term').value;
    executeSearchLogic(searchTerm);
}

function executeSearchLogic(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const resultsDiv = document.getElementById('search-results-list');
    
    const results = posts.filter(post => {
        const titleMatch = post.titulo.toLowerCase().includes(term);
        const tagToSearch = term.startsWith('#') ? term.substring(1) : term;
        const tagMatch = post.tags && post.tags.includes(tagToSearch);
        
        return titleMatch || tagMatch;
    });

    let postsHTML = `<h2>Resultados para "${searchTerm}" (${results.length})</h2>`;
    
    if (results.length === 0) {
        postsHTML += '<p style="padding: 20px; text-align: center;">No se encontraron obras que coincidan con la búsqueda.</p>';
    } else {
        [...results].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(post => { postsHTML += createPostCardHTML(post); });
    }
    
    resultsDiv.innerHTML = postsHTML;
    addActionListener(); 
}


// =========================================================
// 5. INICIALIZACIÓN FINAL
// =========================================================

function handleLogout() {
    alert("Cerrando sesión. Volviendo a la página de autenticación.");
    localStorage.removeItem('currentUserData');
    window.location.href = 'login.html'; 
}

document.addEventListener('DOMContentLoaded', async () => {
    const storedUserData = localStorage.getItem('currentUserData');
    if (!storedUserData) {
        window.location.href = 'login.html'; 
        return; 
    }

    loadData(); 

    document.getElementById('nav-feed').addEventListener('click', (e) => { e.preventDefault(); navigateTo('view-feed'); });
    document.getElementById('nav-profile').addEventListener('click', (e) => { e.preventDefault(); navigateTo('view-profile'); });
    document.getElementById('nav-create').addEventListener('click', (e) => { e.preventDefault(); navigateTo('view-create'); });
    document.getElementById('nav-search').addEventListener('click', (e) => { e.preventDefault(); navigateTo('view-search'); });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    updateSidebarProfile();
    navigateTo('view-feed'); 
});