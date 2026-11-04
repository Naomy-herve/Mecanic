import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");
const products = read("src/app/api/products/route.ts");
const equivalents = read("src/app/api/products/[slug]/equivalents/route.ts");
const orders = read("src/app/api/orders/route.ts");
const customerOrders = read("src/app/api/account/orders/route.ts");
const adminOrders = read("src/app/api/admin/orders/route.ts");
const adminProducts = read("src/app/api/admin/products/route.ts");
const register = read("src/app/api/auth/register/route.ts");
const login = read("src/app/api/auth/login/route.ts");
const catalogue = read("src/app/catalogue/page.tsx");
const productPage = read("src/app/produit/[slug]/page.tsx");
const cartPage = read("src/app/panier/page.tsx");
const cartStorage = read("src/lib/cart.ts");
const addToCart = read("src/components/add-to-cart.tsx");
const adminMetrics = read("src/app/api/admin/metrics/route.ts");
const referencePages = read("src/components/reference-pages.tsx");
const homePage = read("src/app/page.tsx");
const inquiries = read("src/app/api/inquiries/route.ts");
const siteHeader = read("src/components/site-header.tsx");
const globalCss = read("src/app/globals.css");

assert.match(products, /p\.is_active\s*=\s*true/, "Le catalogue public ne doit exposer que les pièces actives.");
assert.match(equivalents, /e\.verified\s*=\s*true/, "Les équivalences publiques doivent être vérifiées.");
assert.match(equivalents, /p\.is_active\s*=\s*true/, "Les équivalences inactives ne doivent pas être exposées.");

assert.match(orders, /await client\.query\("BEGIN"\)/, "La commande doit être transactionnelle.");
assert.match(orders, /FOR UPDATE/, "Les lignes produit doivent être verrouillées pendant la commande.");
assert.match(orders, /stock_quantity=stock_quantity-\$1/, "Le stock doit être décrémenté côté serveur.");
assert.match(orders, /product\.price/, "Le total doit être calculé à partir des prix de la base.");
assert.match(orders, /ROLLBACK/, "Une erreur doit annuler la transaction.");
assert.match(orders, /currency !== currency/, "Les devises mixtes doivent être refusées.");

assert.match(customerOrders, /getSession\(\)/, "L'historique exige une session.");
assert.match(customerOrders, /WHERE o\.user_id = \$1/, "Un client ne peut lire que ses propres commandes.");
assert.match(adminOrders, /requireAdmin\(\)/, "La gestion des commandes est réservée aux administrateurs.");
assert.match(adminProducts, /requireAdmin\(\)/, "La gestion des produits est réservée aux administrateurs.");

assert.match(catalogue, /p\.currency = \$9/, "Le filtre de prix doit respecter la devise sélectionnée.");
assert.match(catalogue, /p\.currency ASC, p\.price ASC/, "Le tri des prix doit séparer les devises.");
assert.match(productPage, /style:"currency",currency/, "Les prix produit doivent respecter le format monétaire.");
assert.match(cartPage, /style:"currency",currency/, "Les totaux du panier doivent respecter le format monétaire.");
assert.match(cartStorage, /Number\.isFinite\(item\.price\)/, "Le panier doit rejeter les prix non numériques.");
assert.match(cartStorage, /item\.quantity <= 20/, "Le panier doit limiter chaque référence à 20 unités.");
assert.match(cartStorage, /result\.length >= 30/, "Le panier doit limiter le nombre de références.");
assert.match(addToCart, /readCart\(\)/, "L’ajout au panier doit utiliser le stockage validé.");
assert.match(productPage, /<AddToCart product=/, "La fiche produit doit permettre un ajout au panier.");
assert.match(catalogue, /<AddToCart product=/, "Les cartes du catalogue doivent permettre un ajout au panier.");
assert.match(productPage, /disabled=\{p\.stock_quantity<=0\}/, "Une pièce sans stock ne doit pas être ajoutée directement au panier.");
assert.match(cartPage, /aria-label=\{"Augmenter la quantité/, "Les contrôles de quantité doivent avoir des libellés accessibles.");
assert.match(adminMetrics, /requireAdmin\(\)/, "Les indicateurs de gestion doivent être protégés.");
assert.match(adminMetrics, /low_stock_products/, "Le stock faible doit provenir de la base.");
assert.match(adminMetrics, /total_orders[\s\S]*pending_orders[\s\S]*total_inquiries[\s\S]*new_inquiries/, "Les indicateurs administrateur doivent compter les commandes et demandes réelles.");
assert.match(referencePages, /total_orders[\s\S]*pending_orders[\s\S]*total_inquiries[\s\S]*new_inquiries/, "Les pages de gestion doivent afficher les nouveaux indicateurs.");
assert.match(referencePages, /fetch\("\/api\/admin\/metrics"/, "Les pages administrateur doivent charger les indicateurs réels.");
assert.doesNotMatch(referencePages, /"À vérifier"/, "Les indicateurs fictifs ne doivent pas être affichés.");
assert.match(inquiries, /NextResponse\.redirect\(new URL\("\/\?contact=sent#contact"/, "Le formulaire public doit revenir avec un état de confirmation.");
assert.match(homePage, /params\.contact==="sent"/, "La page d’accueil doit afficher la confirmation de demande.");
assert.match(siteHeader, /href="\/panier"/, "Le panier doit être accessible depuis la navigation principale.");
assert.match(siteHeader, /<Link href="\/compte">Mon compte<\/Link>/, "Le compte doit rester accessible dans la navigation mobile.");
assert.match(globalCss, /@media\(max-width:800px\)\{[^}]*\.nav-wrap[^}]*\}[\s\S]*?\.main-nav\{display:flex/, "La navigation principale doit rester visible sur mobile.");
assert.match(globalCss, /:focus-visible\{outline:/, "Les éléments interactifs doivent avoir un indicateur de focus clavier.");

for (const [name, source] of [["inscription", register], ["connexion", login]]) {
  assert.match(source, /trim\(\)\.toLowerCase\(\)/, "L'e-mail doit être normalisé avant validation : " + name + ".");
  assert.match(source, /z\.email\(\)\.max\(254\)/, "L'e-mail doit être validé : " + name + ".");
}

console.log("Contrôles réussis : catalogue, équivalences, commandes, accès, devises et normalisation des e-mails.");
