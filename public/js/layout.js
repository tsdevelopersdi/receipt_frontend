/**
 * Workspace Utility
 * Manages the active project context for the engineering modules.
 */
const Workspace = {
    STORAGE_KEY: 'cakra_active_project',
    getActiveProject() {
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || null; }
        catch (e) { return null; }
    },
    setActiveProject(project) {
        if (!project) return;
        const id = project.id || project.ID;
        if (!id) {
            console.error('Invalid project data (missing ID) provided to Workspace.setActiveProject:', project);
            return;
        }
        // Normalize to 'id' for storage consistency
        const normalizedProject = { ...project, id: id };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalizedProject));
        window.dispatchEvent(new CustomEvent('workspaceChange', { detail: normalizedProject }));
    },
    clearActiveProject() {
        localStorage.removeItem(this.STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('workspaceChange', { detail: null }));
    },
    hasActiveProject() { return !!this.getActiveProject(); }
};
window.Workspace = Workspace;

// Run session check immediately on every page that includes layout.js
Auth.checkSession();

function renderLayout(activePage) {
    // Set static title and favicon from API_CONFIG
    document.title = API_CONFIG.title;

    // Inject or update favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    favicon.href = 'img/estimacore.png';

    const user = Auth.getUser();
    const role = Auth.getUserRole();

    // 1. Inject Sidebar
    let sidebarItems = '';

    if (role === 'user') {
        sidebarItems = `
            <div class="sidebar-section-label">Finance</div>
            <li>
                <a href="#invoiceSubmenu" data-bs-toggle="collapse" aria-expanded="${['invoice_upload', 'list_invoice'].includes(activePage) ? 'true' : 'false'}" class="dropdown-toggle ${['invoice_upload', 'list_invoice'].includes(activePage) ? '' : 'collapsed'}">
                    <i class="fas fa-file-invoice-dollar"></i> <span>Receipt</span>
                </a>
                <ul class="collapse list-unstyled ${['invoice_upload', 'list_invoice'].includes(activePage) ? 'show' : ''}" id="invoiceSubmenu">
                    <li>
                        <a href="/invoice_upload" class="${activePage === 'invoice_upload' ? 'active' : ''}">
                             <i class="fas fa-upload me-2" style="font-size: 0.8rem;"></i> <span>Upload</span>
                        </a>
                    </li>
                </ul>
            </li>
        `;
    } else {
        // Admin/Manager/Others see everything
        sidebarItems = `
            <div class="sidebar-section-label">Finance</div>
            <li>
                <a href="#invoiceSubmenu" data-bs-toggle="collapse" aria-expanded="${['invoice_upload', 'list_invoice', 'invoice_detail'].includes(activePage) ? 'true' : 'false'}" class="dropdown-toggle ${['invoice_upload', 'list_invoice', 'invoice_detail'].includes(activePage) ? '' : 'collapsed'}">
                    <i class="fas fa-file-invoice-dollar"></i> <span>Receipt</span>
                </a>
                <ul class="collapse list-unstyled ${['invoice_upload', 'list_invoice', 'invoice_detail'].includes(activePage) ? 'show' : ''}" id="invoiceSubmenu">
                    <li>
                        <a href="/invoice_upload" class="${activePage === 'invoice_upload' ? 'active' : ''}">
                             <i class="fas fa-upload me-2" style="font-size: 0.8rem;"></i> <span>Upload</span>
                        </a>
                    </li>
                    <li>
                        <a href="/list_invoice" class="${activePage === 'list_invoice' ? 'active' : ''}">
                             <i class="fas fa-list me-2" style="font-size: 0.8rem;"></i> <span>List</span>
                        </a>
                    </li>
                </ul>
            </li>
        `;
    }


    const sidebarHTML = `
    <nav id="sidebar" class="d-flex flex-column h-100">
        <div class="sidebar-header">
            <img src="img/estimacore.png" alt="Logo" class="sidebar-logo">
            <h3>${API_CONFIG.title}</h3>
        </div>

        <ul class="list-unstyled components flex-grow-1">
            ${sidebarItems}
        </ul>
    </nav>
    <!-- Overlay -->
    <div class="overlay"></div>
    `;

    document.getElementById('sidebar-container').innerHTML = sidebarHTML;


    // 5. Inject Navbar into the beginning of #content
    const navbarHTML = `
    <nav class="navbar navbar-expand-lg sticky-top px-3 px-lg-4">
        <div class="container-fluid p-0">
            <div class="d-flex align-items-center">
                <button type="button" id="sidebarCollapse" class="btn btn-sm btn-outline-primary me-2">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="navbar-brand-mobile d-lg-none fw-bold text-primary ms-1" style="font-size: 0.9rem; letter-spacing: 0.5px;">
                    ${API_CONFIG.title}
                </div>
            </div>

            <div class="d-flex align-items-center">
                <div class="dropdown">
                    <a class="nav-link user-dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <div class="user-info-wrapper d-none d-sm-block text-end me-2">
                            <div class="user-email text-dark fw-bold" style="font-size: 0.8rem; line-height: 1.2;">${user.email || 'Admin Use'}</div>
                            <span class="badge bg-primary-light text-primary" style="font-size: 0.6rem; padding: 2px 6px; border-radius: 4px;">${user.role || ''}</span>
                        </div>
                        <div class="avatar-circle">
                            <i class="fas fa-user-circle fa-2x text-primary shadow-sm"></i>
                        </div>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2" aria-labelledby="navbarDropdown">
                        <li class="px-3 py-2 d-sm-none border-bottom">
                            <div class="fw-bold text-dark mb-0" style="font-size: 0.85rem;">${user.email || 'Admin'}</div>
                            <span class="badge bg-primary-light text-primary" style="font-size: 0.65rem;">${user.role || ''}</span>
                        </li>
                        <li><a class="dropdown-item py-2" href="#" id="logoutLink"><i class="fas fa-sign-out-alt me-2 text-danger"></i>Logout</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>
    `;

    // Prepend navbar to content
    const contentDiv = document.getElementById('content');
    contentDiv.insertAdjacentHTML('afterbegin', navbarHTML);

    // 6. Initialize Interactive Logic (Toggle, etc.)
    initializeLayoutInteractions();
}


function initializeLayoutInteractions() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (e) {
            e.preventDefault();
            // Clear workspace too on logout
            if (window.Workspace) Workspace.clearActiveProject();
            Auth.logout();
        });
    }

    // Sidebar Toggle Logic
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const overlay = document.querySelector('.overlay');

    // 1. Check LocalStorage on init (Desktop only)
    if (window.innerWidth > 768) {
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            content.classList.add('collapsed');
        }
    }

    // 2. Toggle Event
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                // Mobile behavior
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            } else {
                // Desktop behavior
                sidebar.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
                // Save state
                localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
            }
        });
    }

    // 3. Close sidebar on overlay click (Mobile)
    if (overlay) {
        overlay.addEventListener('click', function () {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

/**
 * Dynamically loads jQuery and DataTables, then initializes the table.
 * @param {string} selector - CSS selector for the table (e.g., '#myTable')
 * @param {object} options - Optional DataTables configuration object
 */
async function initDataTable(selector, options = {}) {
    try {
        // 1. Load jQuery if not present
        if (!window.jQuery) {
            await loadScript('https://code.jquery.com/jquery-3.7.0.min.js');
        }

        // 2. Load DataTables CSS & JS (Bootstrap 5 Check)
        if (!$.fn.DataTable) {
            loadCSS('https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css');
            await loadScript('https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js');
            await loadScript('https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js');

            // Load DataTables Buttons extension for Excel export
            loadCSS('https://cdn.datatables.net/buttons/2.4.2/css/buttons.bootstrap5.min.css');
            await loadScript('https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js');
            await loadScript('https://cdn.datatables.net/buttons/2.4.2/js/buttons.bootstrap5.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            await loadScript('https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js');

            // Setup global AJAX error handling for 403 Forbidden
            $(document).ajaxError(function (event, jqXHR, ajaxSettings, thrownError) {
                if (jqXHR.status === 403) {
                    console.warn('Unauthorized (403) detected. Logging out.');
                    Auth.logout();
                }
            });
        }

        // 3. Initialize DataTable with merged options
        const defaultOptions = {
            responsive: true,
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search...",
            },
            lengthMenu: [5, 10, 25, 50],
            pageLength: 10
        };

        const finalOptions = { ...defaultOptions, ...options };

        // Deep merge language or other nested objects if necessary, 
        // but for now simple spread is enough for top-level overrides.
        // If user passes specific language overrides, we might want to manually merge.
        if (options.language) {
            finalOptions.language = { ...defaultOptions.language, ...options.language };
        }

        $(selector).DataTable(finalOptions);

    } catch (error) {
        console.error('Failed to initialize DataTable:', error);
    }
}

// Helper to load JS
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Helper to load CSS
function loadCSS(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

// SweetAlert2 Helpers
async function ensureSwal() {
    if (window.Swal) return;
    try {
        await loadScript('https://cdn.jsdelivr.net/npm/sweetalert2@11');
    } catch (e) {
        console.error('Failed to load SweetAlert2:', e);
    }
}

async function showAlert(title, text, icon = 'info') {
    await ensureSwal();
    if (window.Swal) {
        return Swal.fire({ title, text, icon, confirmButtonColor: '#d33' });
    }
    alert(text || title);
}

async function showConfirm(title, text, confirmButtonText = 'Yes', icon = 'warning') {
    await ensureSwal();
    if (window.Swal) {
        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText
        });
        return result.isConfirmed;
    }
    return confirm(text || title);
}

async function showToast(title, icon = 'success') {
    // Suppress error toasts if we are in the middle of a logout redirect
    if (icon === 'error' && window.Auth && Auth.isLoggingOut) {
        console.warn('Toast suppressed during logout:', title);
        return;
    }

    await ensureSwal();
    if (window.Swal) {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({ icon, title });
    }
}

// Export to window
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.showToast = showToast;
window.ensureSwal = ensureSwal;
