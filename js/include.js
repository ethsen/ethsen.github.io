// script.js
function showDetail(projectId) {
    // Logic to switch the 'Home' view to a specific 'Project Detail' view
    const mainContent = document.getElementById('home');
    mainContent.innerHTML = `
        <button onclick="location.reload()"> [BACK_TO_GRID] </button>
        <div class="wireframe-border" style="margin-top:20px;">
            <h2>In-Depth: ${projectId}</h2>
            <p>Detailed technical challenges, wireframes, and code snippets go here...</p>
            </div>
    `;
}

// Simple Tab Navigation
document.querySelectorAll('nav a').forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        const target = link.getAttribute('href').substring(1);
        document.querySelectorAll('section').forEach(s => s.style.display = 'none');
        document.getElementById(target).style.display = 'block';
    }
});