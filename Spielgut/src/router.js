import { ProductController } from "./controllers/product_controller.js"
import { LoginController } from "./controllers/login_controller.js"
import { CartController } from "./controllers/cart_controller.js"
import { RegisterController } from "./controllers/register_controller.js"
import { StaticFileController } from "./controllers/staticFile_controller.js"
import { AssetFileController } from "./controllers/assetFile_controller.js"
import {
  getUserFromSession,
  getAndClearFlashMessage,
  setFlashMessage,
  clearFlashMessageCookie,
} from "./controllers/flashmessages_controller.js"
import { csrfProtection, generateCSRFToken } from "./csrf.js"
import { createDebug } from "./services/debug.js"
import { UserManagementController } from "./controllers/user_managment_controller.js"
import { MessageController } from "./controllers/message_controller.js"
import { getRequestBody } from "./services/requestBodyHelper.js"

const log = createDebug("spielgut:router")

export class Router {
  constructor(render) {
    this.render = render
    this.productController = new ProductController()
    this.loginController = new LoginController()
    this.cartController = new CartController(render)
    this.registerController = new RegisterController()
    this.staticFileController = new StaticFileController()
    this.assetFileController = new AssetFileController()
    this.userManagementController = new UserManagementController()
    this.messageController = new MessageController()
  }

  async route(request) {
    try {
      const url = new URL(request.url)
      const path = url.pathname
      const searchParams = url.searchParams

      
      if (path.startsWith("/static/") || path === "/styles.css" || path === "/script.js") {
        return await this.staticFileController.serveStaticFile(path)
      }

      
      if (path.startsWith("/assets/") || path.endsWith(".jpeg") || path.endsWith(".png")) {
        return await this.assetFileController.serveAssetFile(path)
      }

      const user = getUserFromSession(request)
      const csrfToken = await generateCSRFToken(user ? user.sessionId : "anonymous")
      const flashMessage = getAndClearFlashMessage(request)

      log("Router: Abgerufene Flash-Nachrichten:", flashMessage)

      if (request.method === "POST") {
        log("Router: Anfrage mit POST-Methode empfangen")
        const body = await getRequestBody(request)
        log("Router: Body extrahiert:", body)
      }

      
      if (request.method !== "GET" && !(await csrfProtection(request, user))) {
        log("CSRF token validation failed")
        return new Response("Invalid CSRF token", { status: 403 })
      }

      let pageData
      let response

      switch (path) {
        case "/":
          pageData = await this.productController.getHomePageData(user, flashMessage, csrfToken)
          response = await this.render("index.html", { ...pageData, user, flashMessage, csrfToken })
          break
        case "/new-products":
          const filterParams = {
            category: searchParams.get("category") || null,
            priceMin: searchParams.get("priceMin") || null,
            priceMax: searchParams.get("priceMax") || null,
          }
          pageData = await this.productController.getNewProductsData(user, flashMessage, csrfToken, filterParams)
          response = await this.render("new-products.html", { ...pageData, user, flashMessage, csrfToken })
          break
        case "/used-products":
          const usedFilterParams = {
            category: searchParams.get("category") || null,
            priceMin: searchParams.get("priceMin") || null,
            priceMax: searchParams.get("priceMax") || null,
            condition: searchParams.get("condition") || null,
          }
          pageData = await this.productController.getUsedProductsData(user, flashMessage, csrfToken, usedFilterParams)
          response = await this.render("used-products.html", { ...pageData, user, flashMessage, csrfToken })
          break
        case "/about":
          response = await this.render("about.html", { user, flashMessage, csrfToken })
          break
        case "/contact":
          if (request.method === "GET") {
            pageData = { user, flashMessage, csrfToken }
            response = await this.render("contact.html", pageData)
          } else if (request.method === "POST") {
            response = await this.messageController.createContactMessage(request)
          }
          break
        case "/login":
          if (user) {
            response = new Response("", {
              status: 302,
              headers: { Location: "/account" },
            })
          } else if (request.method === "GET") {
            response = await this.render("login.html", { user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            log("Router: Übergebe POST-Anfrage an LoginController")
            response = await this.loginController.handleLogin(request)
          }
          break
        case "/account":
          if (!user) {
            response = new Response("", {
              status: 302,
              headers: { Location: "/login" },
            })
          } else if (request.method === "GET") {
            const accountData = await this.loginController.getAccountData(user)
            response = await this.render("account.html", { user: { ...user, ...accountData }, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            response = await this.loginController.handleAccountUpdate(request, user)
          }
          break
        case "/register":
          if (request.method === "GET") {
            response = await this.render("register.html", { user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            response = await this.registerController.handleRegister(request)
          }
          break
        case "/messages":
          if (request.method === "GET") {
            pageData = await this.messageController.renderMessageList(user, flashMessage, csrfToken)
            response = await this.render("message-overview.html", pageData)
          } else if (request.method === "POST") {
            response = await this.messageController.createMessage(request, user)
          }
          break
        case "/messages/new":
          if (request.method === "GET") {
            pageData = await this.messageController.renderNewMessageForm(user, flashMessage, csrfToken)
            response = await this.render("new-message.html", pageData)
          }
          break
        case (path.match(/^\/messages\/\d+$/) || {}).input:
          const messageId = Number.parseInt(path.split("/")[2])
          pageData = await this.messageController.renderMessageDetail(user, messageId, flashMessage, csrfToken)
          response = await this.render("message-detail.html", pageData)
          break

        case (path.match(/^\/messages\/\d+\/reply$/) || {}).input:
          if (request.method === "POST") {
            const messageId = Number.parseInt(path.split("/")[2])
            response = await this.messageController.replyToMessage(request, user, messageId)
          }
          break
        case "/api/logout":
          response = await this.loginController.handleLogout(request)
          break
        case "/shopping_cart":
          pageData = await this.cartController.renderShoppingCart(user, csrfToken)
          response = await this.render("shoppingcart.html", { ...pageData, user, flashMessage, csrfToken })
          break
        case "/api/cart/add":
          if (request.method === "POST") {
            response = await this.cartController.handleAddToCart(request, user)
          }
          break
        case "/api/cart/update":
          if (request.method === "POST") {
            response = await this.cartController.handleUpdateCartItem(request, user)
          }
          break
        case "/api/cart/remove":
          if (request.method === "POST") {
            response = await this.cartController.handleRemoveFromCart(request, user)
          }
          break
        case "/create-product":
          log("Handling create-product route")
          if (!user || user.role !== "admin") {
            log("Unauthorized access attempt to create-product")
            response = new Response("", {
              status: 302,
              headers: { Location: "/login" },
            })
          } else if (request.method === "GET") {
            log("Rendering create-product form")
            response = await this.render("create-product.html", { user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            log("Processing create-product POST request")
            response = await this.productController.handleCreateProduct(request, user)
            log("Create product response:", response)
          }
          break
        case "/search":
          const searchQuery = searchParams.get("q")
          pageData = await this.productController.getSearchResults(user, searchQuery, flashMessage, csrfToken)
          response = await this.render("search-results.html", { ...pageData, user, flashMessage, csrfToken })
          break
        case "/user-management":
          if (request.method === "GET") {
            pageData = await this.userManagementController.renderUserManagement(user, flashMessage, csrfToken)
            response = await this.render("user-managment.html", { ...pageData, user })
          } else if (request.method === "POST") {
            const action = searchParams.get("action")
            if (action === "update") {
              response = await this.userManagementController.handleUpdateUser(request, user)
            } else if (action === "delete") {
              response = await this.userManagementController.handleDeleteUser(request, user)
            }
          }
          break
        case (path.match(/^\/product\/\d+\/edit$/) || {}).input:
          if (request.method === "GET") {
            const editProductId = Number.parseInt(path.split("/")[2])
            pageData = await this.productController.getProductEditData(user, editProductId, flashMessage, csrfToken)
            response = await this.render("product_edit.html", { ...pageData, user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            const editProductId = Number.parseInt(path.split("/")[2])
            response = await this.productController.handleProductUpdate(request, user, editProductId)
          }
          break
        case "/create-used-product":
          if (!user) {
            response = new Response("", {
              status: 302,
              headers: { Location: "/login" },
            })
          } else if (request.method === "GET") {
            response = await this.render("create-used-product.html", { user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            response = await this.productController.handleCreateUsedProduct(request, user)
          }
          break
        case (path.match(/^\/used-product\/\d+\/edit$/) || {}).input:
          if (request.method === "GET") {
            const editProductId = Number.parseInt(path.split("/")[2])
            pageData = await this.productController.getUsedProductEditData(user, editProductId, flashMessage, csrfToken)
            response = await this.render("used_product_edit.html", { ...pageData, user, flashMessage, csrfToken })
          } else if (request.method === "POST") {
            const editProductId = Number.parseInt(path.split("/")[2])
            response = await this.productController.handleUsedProductUpdate(request, user, editProductId)
          }
          break
        case (path.match(/^\/used-product\/\d+\/delete$/) || {}).input:
          if (request.method === "POST") {
            const deleteProductId = Number.parseInt(path.split("/")[2])
            response = await this.productController.handleUsedProductDelete(user, deleteProductId)
          }
          break
        default:
          if (path.match(/^\/product\/\d+$/)) {
            const productId = Number.parseInt(path.split("/")[2])
            const quantity = searchParams.get("quantity")
            const addToCartSuccess = searchParams.get("success") === "true"
            pageData = await this.productController.getProductDetailsData(
              user,
              productId,
              quantity,
              addToCartSuccess,
              flashMessage,
              csrfToken,
            )
            if (pageData.error) {
              response = await this.render("error404.html", { user, flashMessage: pageData.error, csrfToken })
            } else {
              response = await this.render("product_details.html", { ...pageData, user, flashMessage, csrfToken })
            }
          } else if (path.match(/^\/product\/\d+\/delete$/)) {
            if (request.method === "POST") {
              const deleteProductId = Number.parseInt(path.split("/")[2])
              response = await this.productController.handleProductDelete(user, deleteProductId)
            }
          } else if (path.match(/^\/used-product\/\d+$/)) {
            const productId = Number.parseInt(path.split("/")[2])
            pageData = await this.productController.getUsedProductDetailsData(user, productId, flashMessage, csrfToken)
            if (pageData.error) {
              response = await this.render("error404.html", { user, flashMessage: pageData.error, csrfToken })
            } else {
              response = await this.render("used_product_details.html", { ...pageData, user, flashMessage, csrfToken })
            }
          } else {
            response = await this.render("error404.html", { user, flashMessage, csrfToken })
          }
      }

      if (flashMessage && Object.keys(flashMessage).length > 0) {
        clearFlashMessageCookie(response)
      }

      return response
    } catch (error) {
      console.error("Router error:", error)
      const response = new Response("Ein Fehler ist aufgetreten", { status: 500 })
      setFlashMessage(
        response,
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        "error",
      )
      return response
    }
  }
}

