import { ProductController } from "./controllers/product_controller.js";
import { LoginController } from "./controllers/login_controller.js";
import { CartController } from "./controllers/cart_controller.js";
import { RegisterController } from "./controllers/register_controller.js";
import { StaticFileController } from "./controllers/staticFile_controller.js";
import { AssetFileController } from "./controllers/assetFile_controller.js";
import { getUserFromSession, getAndClearFlashMessage, setFlashMessage, clearFlashMessageCookie } from "./controllers/flashmessages_controller.js";
import { csrfProtection, generateCSRFToken} from "./csrf.js";

export class Router {
    constructor(render) {
      this.render = render;
      this.productController = new ProductController();
      this.loginController = new LoginController();
      this.cartController = new CartController();
      this.registerController = new RegisterController();
      this.staticFileController = new StaticFileController();
      this.assetFileController = new AssetFileController();
    }

    async route(request) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;
            const searchParams = url.searchParams;

            // Serve static files
            if (path.startsWith("/static/") || path === "/styles.css" || path === "/script.js") {
              return await this.staticFileController.serveStaticFile(path);
            }

            // Serve asset files
            if (path.startsWith("/assets/") || path.endsWith(".jpeg") || path.endsWith(".png")) {
              return await this.assetFileController.serveAssetFile(path);
            }

            const user = getUserFromSession(request);
            const csrfToken = user ? await generateCSRFToken(user.sessionId) : null;
            let flashMessage = getAndClearFlashMessage(request);

            // Check CSRF token for POST, PUT, DELETE requests
            if (!await csrfProtection(request, user)) {
              return new Response("Invalid CSRF token", { status: 403 });
            }

            let pageData;
            let response;

            switch (path) {
                case '/':
                    pageData = await this.productController.getHomePageData();
                    response = await this.render("index.html", { ...pageData, user, flashMessage, csrfToken });
                    break;
                case "/new-products":
                    const page = parseInt(searchParams.get('page') || '1');
                    pageData = await this.productController.getNewProductsData(page);
                    response = await this.render("new-products.html", { ...pageData, user, flashMessage, csrfToken });
                    break;
                case "/used-products":
                    const usedPage = parseInt(searchParams.get('page') || '1');
                    pageData = await this.productController.getUsedProductsData(usedPage);
                    response = await this.render("used-products.html", { ...pageData, user, flashMessage, csrfToken });
                    break;
                case "/about":
                    response = await this.render("about.html", { user, flashMessage, csrfToken });
                    break;
                case "/contact":
                    response = await this.render("contact.html", { user, flashMessage, csrfToken });
                    break;
                case "/login":
                    if (user) {
                        response = new Response("", {
                            status: 302,
                            headers: { "Location": "/account" },
                        });
                    } else if (request.method === "GET") {
                        response = await this.render("login.html", { user, flashMessage, csrfToken });
                    } else if (request.method === "POST") {
                        response = await this.loginController.handleLogin(request);
                    }
                    break;
                case "/account":
                    if (!user) {
                        response = new Response("", {
                            status: 302,
                            headers: { "Location": "/login" },
                        });
                    } else {
                        const accountData = await this.loginController.getAccountData(user);
                        response = await this.render("account.html", { ...accountData, user, flashMessage, csrfToken });
                    }
                    break;
                case "/register":
                    if (request.method === "GET") {
                        response = await this.render("register.html", { user, flashMessage, csrfToken });
                    } else if (request.method === "POST") {
                        response = await this.registerController.handleRegister(request);
                    }
                    break;
                case "/api/logout":
                    response = await this.loginController.handleLogout(request);
                    break;
                case "/shopping_cart":
                    pageData = await this.cartController.getShoppingCartData(user);
                    response = await this.render("shopping_cart.html", { ...pageData, user, flashMessage, csrfToken });
                    break;
                case "/api/cart/add":
                    if (request.method === "POST") {
                        response = await this.cartController.handleAddToCart(request, user);
                    }
                    break;
                case "/api/cart/update":
                    if (request.method === "POST") {
                        response = await this.cartController.handleUpdateCartItem(request, user);
                    }
                    break;
                case "/api/cart/remove":
                    if (request.method === "POST") {
                        response = await this.cartController.handleRemoveFromCart(request, user);
                    }
                    break;
                default:
                    if (path.match(/^\/product\/\d+$/)) {
                        const productId = parseInt(path.split('/')[2]);
                        const quantity = searchParams.get('quantity');
                        const addToCartSuccess = searchParams.get('success') === 'true';
                        pageData = await this.productController.getProductDetailsData(productId, quantity, addToCartSuccess);
                        response = await this.render("product_details.html", { ...pageData, user, flashMessage, csrfToken });
                    } else if (path.match(/^\/product\/\d+\/edit$/)) {
                        const editProductId = parseInt(path.split('/')[2]);
                        if (request.method === 'GET') {
                            pageData = await this.productController.getProductEditData(editProductId);
                            response = await this.render("product_edit.html", { ...pageData, user, flashMessage, csrfToken });
                        } else if (request.method === 'POST') {
                            response = await this.productController.handleProductUpdate(user, editProductId, request.parsedFormData);
                        }
                    } else if (path.match(/^\/product\/\d+\/delete$/)) {
                        if (request.method === 'POST') {
                            const deleteProductId = parseInt(path.split('/')[2]);
                            response = await this.productController.handleProductDelete(user, deleteProductId);
                        }
                    } else {
                        response = await this.render("error404.html", { user, flashMessage, csrfToken });
                    }
            }

            if (flashMessage) {
                clearFlashMessageCookie(response);
            }

            return response;

        } catch (error) {
            console.error("Router error:", error);
            const response = new Response("Ein Fehler ist aufgetreten", { status: 500 });
            setFlashMessage(response, "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", "error");
            return response;
        }
    }
}

