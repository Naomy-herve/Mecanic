import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");
const products = read("src/app/api/products/route.ts");
const equivalents = read("src/app/api/products/[slug]/equivalents/route.ts");
const orders = read("src/app/api/orders/route.ts");
const customerOrders = read("src/app/api/account/orders/route.ts");
const adminOrders = read("src/app/api/admin/orders/route.ts");
const inventoryMovementsApi = read("src/app/api/admin/inventory/movements/route.ts");
const inventoryHelper = read("src/lib/inventory.ts");
const adminProducts = read("src/app/api/admin/products/route.ts");
const adminProductsPage = read("src/app/admin/produits/page.tsx");
const register = read("src/app/api/auth/register/route.ts");
const login = read("src/app/api/auth/login/route.ts");
const catalogue = read("src/app/catalogue/page.tsx");
const productPage = read("src/app/produit/[slug]/page.tsx");
const cartPage = read("src/app/panier/page.tsx");
const cartStorage = read("src/lib/cart.ts");
const addToCart = read("src/components/add-to-cart.tsx");
const adminMetrics = read("src/app/api/admin/metrics/route.ts");
const adminDashboard = read("src/app/admin/page.tsx");
const authModule = read("src/lib/auth.ts");
const teamApi = read("src/app/api/admin/team/route.ts");
const staffDashboard = read("src/app/equipe/page.tsx");
const loginApi = read("src/app/api/auth/login/route.ts");
const notificationHelper = read("src/lib/notifications.ts");
const notificationApi = read("src/app/api/notifications/route.ts");
const notificationPreferencesApi = read("src/app/api/notifications/preferences/route.ts");
const notificationPage = read("src/app/compte/profil/notifications.tsx");


const stockPage = read("src/app/admin/stocks/page.tsx");
const referencePages = read("src/components/reference-pages.tsx");
const homePage = read("src/app/page.tsx");
const inquiries = read("src/app/api/inquiries/route.ts");
const siteHeader = read("src/components/site-header.tsx");
const globalCss = read("src/app/globals.css");
const adminVehicles = read("src/app/admin/vehicules/page.tsx");
const adminVehiclesApi = read("src/app/api/admin/vehicles/route.ts");
const adminCategories = read("src/app/api/admin/categories/route.ts");
const adminCategoriesPage = read("src/app/admin/categories/page.tsx");
const adminEquivalentsPage = read("src/app/admin/equivalences/manager.tsx");
const bootstrapAdmin = read("src/app/api/auth/bootstrap-admin/route.ts");
const bootstrapAdminPage = read("src/app/admin/initialiser/page.tsx");



assert.match(products, /p\.is_active\s*=\s*true/, "Le catalogue public ne doit exposer que les pièces actives.");
assert.match(equivalents, /e\.verified\s*=\s*true/, "Les équivalences publiques doivent être vérifiées.");
assert.match(equivalents, /p\.is_active\s*=\s*true/, "Les équivalences inactives ne doivent pas être exposées.");

assert.match(orders, /await client\.query\("BEGIN"\)/, "La commande doit être transactionnelle.");
assert.match(orders, /FOR UPDATE/, "Les lignes produit doivent être verrouillées pendant la commande.");
assert.match(orders, /stock_quantity\) - Number\(product\.reserved_quantity\)/, "Une commande ne doit utiliser que le stock non réservé.");
assert.match(orders, /reserved_quantity=reserved_quantity\+\$1/, "Une commande en attente doit réserver les quantités.");
assert.doesNotMatch(orders, /stock_quantity=stock_quantity-\$1/, "Une commande en attente ne doit pas retirer le stock physique avant confirmation.");

assert.match(orders, /INSERT INTO stock_reservations/, "Chaque ligne de commande doit créer une réservation.");
assert.match(orders, /interval '24 hours'/, "Les réservations de commande doivent expirer automatiquement après 24 heures.");
assert.match(orders, /SELECT id FROM garages WHERE is_active=true/, "Les commandes doivent être rattachées au garage unique.");
assert.match(orders, /releaseExpiredStockReservations\(\)/, "Les réservations expirées doivent être libérées avant une nouvelle commande.");

assert.match(orders, /product\.price/, "Le total doit être calculé à partir des prix de la base.");
assert.match(orders, /ROLLBACK/, "Une erreur doit annuler la transaction.");
assert.match(adminOrders, /VALUES\(\$1,'sale'/, "La confirmation doit convertir la réservation en mouvement de vente.");
assert.match(adminOrders, /status='consumed'/, "La confirmation doit consommer la réservation.");
assert.match(adminOrders, /status='released'/, "L’annulation doit libérer ou restituer la réservation.");
assert.match(orders, /currency !== currency/, "Les devises mixtes doivent être refusées.");

assert.match(customerOrders, /getSession\(\)/, "L'historique exige une session.");
assert.match(customerOrders, /WHERE o\.user_id = \$1/, "Un client ne peut lire que ses propres commandes.");
assert.match(adminOrders, /requireStaff\("seller","accountant"\)/, "Les commandes sont accessibles aux vendeurs et comptables autorisés.");
assert.match(adminOrders, /movement_type,quantity,reason,reference_type,reference_id/, "L’annulation d’une commande doit tracer le retour au stock.");
assert.match(adminOrders, /INSERT INTO audit_logs/, "Les transitions de commande doivent être auditées.");
assert.match(adminProducts, /requireAdmin\(\)/, "La gestion des produits est réservée aux administrateurs.");
assert.match(adminVehiclesApi, /requireStaff\("mechanic","seller"\)/, "Les véhicules sont accessibles aux mécaniciens et vendeurs autorisés.");
assert.match(adminVehiclesApi, /yearTo<d\.yearFrom/, "L’API doit refuser une plage d’années inversée.");
assert.match(adminVehiclesApi, /Ce véhicule existe déjà/, "L’API doit prévenir les doublons de véhicules.");
assert.match(adminVehicles, /setSaving\(true\)/, "Le formulaire véhicule doit empêcher les doubles soumissions.");
assert.match(adminVehicles, /role="alert"/, "Les erreurs du formulaire véhicule doivent être annoncées.");
assert.match(adminVehicles, /cache: "no-store"/, "La liste des véhicules doit être rechargée sans cache.");
assert.match(adminCategories, /requireAdmin\(\)/, "La gestion des catégories doit être réservée aux administrateurs.");
assert.match(adminCategories, /Cette catégorie contient encore des pièces/, "Une catégorie utilisée ne doit pas être supprimée.");
assert.match(adminCategoriesPage, /cache: "no-store"/, "Les catégories doivent être rechargées sans cache.");
assert.match(adminCategoriesPage, /setSaving\(true\)/, "Le formulaire de catégorie doit empêcher les doubles soumissions.");
assert.match(adminCategoriesPage, /deletingId/, "La suppression d'une catégorie doit avoir un état dédié.");
assert.match(adminCategoriesPage, /role="alert"/, "Les erreurs de catégorie doivent être accessibles.");
assert.match(adminEquivalentsPage, /cache: "no-store"/, "Les équivalences doivent être chargées sans cache.");
assert.match(adminEquivalentsPage, /setSaving\(true\)/, "L'ajout d'une équivalence doit empêcher les doubles soumissions.");
assert.match(adminEquivalentsPage, /deletingId/, "La suppression d'une équivalence doit avoir un état dédié.");
assert.match(adminEquivalentsPage, /Correspondance vérifiée/, "L'administrateur doit pouvoir distinguer les équivalences vérifiées.");


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
assert.match(productPage, /disabled=\{p\.available_quantity<=0\}/, "Une pièce sans stock disponible ne doit pas être ajoutée au panier.");
assert.match(catalogue, /available_quantity/, "Le catalogue doit afficher le stock disponible après réservation.");
assert.match(products, /available_quantity/, "L’API catalogue doit exposer le stock disponible, pas le stock physique brut.");
assert.match(inventoryHelper, /status='expired'/, "Les réservations expirées doivent être libérées de façon centralisée.");
assert.match(inventoryHelper, /o\.status='pending'/, "Une commande en attente doit être annulée lorsque toutes ses réservations expirent.");
assert.match(inventoryHelper, /reservation_expired/, "L’expiration automatique doit être auditée.");

assert.match(inventoryMovementsApi, /reserved_quantity/, "Les mouvements manuels ne doivent pas consommer du stock réservé.");
const inventoryReservationsApi = read("src/app/api/admin/inventory/reservations/route.ts");
assert.match(inventoryReservationsApi, /releaseExpiredStockReservations/, "L’écran inventaire doit libérer les réservations échues avant affichage.");
assert.match(inventoryReservationsApi, /order_number, o\.customer_name|order_number,o\.customer_name/, "L’historique doit identifier la commande et le client concernés.");
assert.match(stockPage, /Réservations de stock/, "L’administration doit afficher les quantités réservées et leurs expirations.");


assert.match(cartPage, /aria-label=\{"Augmenter la quantité/, "Les contrôles de quantité doivent avoir des libellés accessibles.");
assert.match(adminMetrics, /requireAdmin\(\)/, "Les indicateurs de gestion doivent être protégés.");
assert.match(adminMetrics, /low_stock_products/, "Le stock faible doit provenir de la base.");
assert.match(adminMetrics, /total_orders[\s\S]*pending_orders[\s\S]*total_inquiries[\s\S]*new_inquiries/, "Les indicateurs administrateur doivent compter les commandes et demandes réelles.");
assert.match(referencePages, /total_orders[\s\S]*pending_orders[\s\S]*total_inquiries[\s\S]*new_inquiries/, "Les pages de gestion doivent afficher les nouveaux indicateurs.");
assert.match(referencePages, /fetch\("\/api\/admin\/metrics"/, "Les pages administrateur doivent charger les indicateurs réels.");
assert.doesNotMatch(referencePages, /"À vérifier"/, "Les indicateurs fictifs ne doivent pas être affichés.");
assert.match(inquiries, /NextResponse\.redirect\(new URL\("\/\?contact=sent#contact"/, "Le formulaire public doit revenir avec un état de confirmation.");
assert.match(read("src/app/reference/[page]/page.tsx"), /contactSent/, "La route de référence doit transmettre l’état de confirmation du formulaire.");
assert.match(referencePages, /contactSent/, "La page d’accueil doit afficher la confirmation de demande.");
assert.match(siteHeader, /href="\/panier"/, "Le panier doit être accessible depuis la navigation principale.");
assert.match(siteHeader, /<Link href="\/compte">Mon compte<\/Link>/, "Le compte doit rester accessible dans la navigation mobile.");
assert.match(globalCss, /@media\(max-width:800px\)\{[^}]*\.nav-wrap[^}]*\}[\s\S]*?\.main-nav\{display:flex/, "La navigation principale doit rester visible sur mobile.");
assert.match(globalCss, /:focus-visible\{outline:/, "Les éléments interactifs doivent avoir un indicateur de focus clavier.");

for (const [name, source] of [["inscription", register], ["connexion", login]]) {
  assert.match(source, /trim\(\)\.toLowerCase\(\)/, "L'e-mail doit être normalisé avant validation : " + name + ".");
  assert.match(source, /z\.email\(\)\.max\(254\)/, "L'e-mail doit être validé : " + name + ".");
}


const singleGarageMigration = read("database/migrations/20261107_single_garage.sql");
assert.match(singleGarageMigration, /garages_singleton_guard/, "La base doit empêcher la création d’un second garage.");
assert.match(singleGarageMigration, /Indian\/Antananarivo/, "Le garage unique doit utiliser le fuseau horaire de Madagascar.");
assert.match(singleGarageMigration, /'MGA'/, "La devise par défaut du garage doit être l’Ariary.");
assert.match(adminOrders, /stock_quantity=stock_quantity-\$1,reserved_quantity=reserved_quantity-\$1/, "La confirmation doit débiter le stock physique et le réservé ensemble.");
assert.match(adminOrders, /expires_at/, "La confirmation doit refuser une réservation expirée.");
const inventoryCountsApi = read("src/app/api/admin/inventory/counts/route.ts");
assert.match(inventoryCountsApi, /data\.countedQuantity\s*-\s*before/, "L’inventaire physique doit calculer l’écart par rapport au stock système.");
assert.match(inventoryCountsApi, /movement_type,quantity,reason,reference_type/, "Les écarts d’inventaire doivent être tracés comme ajustements.");
assert.match(inventoryCountsApi, /countedQuantity < Number\(current\.rows\[0\]\.reserved_quantity\)/, "Le comptage physique ne doit pas descendre sous le stock réservé.");
assert.match(stockPage, /Valider le comptage physique/, "L’interface doit permettre de saisir le stock réellement compté.");
const supplierOrdersApi = read("src/app/api/admin/supplier-orders/route.ts");
const supplierOrdersPage = read("src/app/admin/fournisseurs/orders.tsx");
assert.match(supplierOrdersApi, /quantity_received=quantity_received\+\$1/, "Les réceptions fournisseurs doivent cumuler les quantités réellement reçues.");
assert.match(supplierOrdersApi, /INSERT INTO inventory_movements/, "Chaque réception liée à une pièce doit créer un mouvement de stock.");
assert.match(supplierOrdersApi, /FOR UPDATE/, "Les réceptions doivent verrouiller les bons et leurs lignes.");
assert.match(supplierOrdersPage, /Valider les quantités reçues/, "L’interface doit permettre de saisir les quantités livrées.");
const productImport = read("src/app/api/admin/products/import/route.ts");
assert.match(adminProducts, /INSERT INTO inventory_movements/, "La création d'une pièce doit tracer son stock initial.");
assert.match(adminProducts, /FOR UPDATE/, "La fiche produit doit verrouiller la ligne avant modification.");
assert.match(adminProducts, /Le stock ne se modifie pas depuis la fiche produit/, "La modification de fiche ne doit pas contourner l'historique du stock.");
assert.match(adminProducts, /INSERT INTO audit_logs/, "Les changements de fiche produit doivent être audités.");
assert.match(productImport, /INSERT INTO inventory_movements/, "L'import CSV doit tracer les stocks initiaux.");
assert.match(productImport, /INSERT INTO audit_logs/, "L'import CSV doit alimenter le journal d'audit.");
assert.match(productImport, /minimum_stock,purchase_price,tax_rate,warranty_months,origin/, "L’import CSV doit prendre en charge les champs de gestion du catalogue.");
assert.match(productImport, /unit_cost,reason,created_by/, "L’import CSV doit rattacher le coût d’achat au mouvement de stock.");
assert.match(adminProductsPage, /readOnly/, "Le stock doit être en lecture seule lors de la modification d'une fiche.");

const workshopPartsApi = read("src/app/api/admin/workshop/jobs/parts/route.ts");
const workshopPage = read("src/app/admin/atelier/page.tsx");
assert.match(workshopPartsApi, /movement_type,quantity,unit_cost,reason,reference_type,reference_id/, "Les pièces consommées en atelier doivent créer un mouvement de stock lié au dossier.");
assert.match(workshopPartsApi, /stock_quantity=stock_quantity-\$1/, "La consommation en atelier doit décrémenter le stock dans la même transaction.");
assert.match(workshopPartsApi, /stock_quantity\) - Number\(row\.reserved_quantity\)/, "L’atelier ne doit pas utiliser des pièces déjà réservées à un client.");
assert.match(workshopPage, /Déduire du stock et rattacher au dossier/, "L’atelier doit proposer l’ajout d’une pièce au dossier.");
const adminAppointments = read("src/app/api/admin/appointments/route.ts");
const workshopApi = read("src/app/api/admin/workshop/jobs/route.ts");
const expensePage = read("src/app/admin/depenses/page.tsx");
const supplierApi = read("src/app/api/admin/suppliers/route.ts");

assert.match(adminAppointments, /pg_advisory_xact_lock/, "Les réservations d’un même mécanicien doivent être sérialisées pour empêcher les doubles créneaux.");
const adminPayments = read("src/app/api/admin/payments/route.ts");
assert.match(adminPayments, /SELECT id,user_id AS customer_id,total,currency,status FROM orders/, "Un paiement de commande doit utiliser la colonne user_id réelle de la base.");
assert.match(adminPayments, /Le montant dépasse le solde restant dû/, "Un paiement ne doit pas dépasser le solde restant.");
assert.match(adminPayments, /BEGIN/, "La création et la validation des paiements doivent être transactionnelles.");
assert.match(adminPayments, /SELECT total,status FROM invoices WHERE id=\$1 FOR UPDATE/, "La validation doit verrouiller la facture avant de recalculer le solde.");
assert.match(adminPayments, /SELECT total,status FROM orders WHERE id=\$1 FOR UPDATE/, "La validation doit verrouiller la commande avant de recalculer le solde.");
assert.match(adminPayments, /validation dépasserait le solde/, "La validation d’un paiement doit prévenir le dépassement concurrent.");
assert.match(adminPayments, /payment\.status === "verified" && data\.status === "refunded"/, "Un paiement confirmé ne peut être remboursé qu’avec une transition contrôlée.");
assert.match(read("src/app/admin/factures/page.tsx"), /customerId:f\.get\("customerId"\)/, "Une facture doit pouvoir être associée à un client.");

assert.match(adminPayments, /paid_at=CASE WHEN \$1='verified'/, "La date de paiement doit être enregistrée lors de la vérification.");
assert.match(adminOrders, /payment_status,total,currency/, "Le formulaire de paiement doit connaître le statut financier des commandes.");
assert.match(read("src/app/admin/paiements/page.tsx"), /Enregistrer le remboursement/, "L’administration doit pouvoir enregistrer un remboursement.");


assert.match(referencePages, /return <main className=\{"ref-page ref-"\+page\.style\}>\s*<div className="ref-container">\s*\{contactSent&&/, "La confirmation de contact doit apparaître sur la vraie page après envoi.");
assert.match(adminProducts, /minimum_stock/ , "La fiche produit doit enregistrer un seuil minimum.");
assert.match(adminProducts, /purchase_price/, "La fiche produit doit enregistrer le prix d’achat.");
assert.match(adminProductsPage, /name="purchasePrice"/, "Le formulaire administrateur doit exposer le prix d’achat.");
assert.match(adminProductsPage, /name="minimumStock"/, "Le formulaire administrateur doit exposer le seuil minimum.");
assert.match(adminProductsPage, /name="taxRate"/, "Le formulaire administrateur doit exposer le taux de taxe.");
assert.match(adminProductsPage, /name="warrantyMonths"/, "Le formulaire administrateur doit exposer la garantie.");
assert.match(bootstrapAdmin, /SELECT id FROM garages WHERE is_active=true/, "Le compte administrateur doit être rattaché au garage unique.");
assert.match(bootstrapAdmin, /garage_id/, "Le bootstrap doit enregistrer le rattachement au garage.");
assert.match(adminDashboard, /FROM payments WHERE status='verified'/, "Le tableau de bord doit compter uniquement les paiements vérifiés.");
assert.match(adminDashboard, /stock_quantity-reserved_quantity/, "Le tableau de bord doit distinguer le stock disponible du stock physique.");
assert.match(adminDashboard, /inventory_movements im/, "La marge estimée doit s’appuyer sur les coûts réellement enregistrés.");
assert.match(adminDashboard, /href="\/admin\/depenses"/, "Le tableau de bord doit donner accès au suivi des dépenses.");
assert.match(authModule, /user_role_assignments/, "Les accès internes doivent être vérifiés depuis les affectations du garage.");
assert.match(authModule, /g\.is_active=true/, "Les rôles doivent être limités au garage actif unique.");
assert.match(teamApi, /grant_staff_role/, "Les attributions de rôle doivent être auditées.");
assert.match(teamApi, /revoke_staff_role/, "Les retraits de rôle doivent être audités.");
assert.match(staffDashboard, /requireStaff/, "Les employés doivent disposer d’un espace adapté à leurs rôles.");
assert.match(loginApi, /staffRoles/, "La connexion doit transmettre les rôles assignés pour rediriger l’employé.");
assert.match(notificationHelper, /notification_preferences/, "Les notifications doivent respecter les préférences du client.");
assert.match(notificationHelper, /channel,status,sent_at/, "Les alertes in-app doivent être enregistrées dans la boîte de réception.");
assert.match(notificationApi, /WHERE id=\$1 AND user_id=\$2/, "Un utilisateur ne peut lire que ses propres notifications.");
assert.match(notificationPreferencesApi, /ON CONFLICT\(user_id\) DO UPDATE/, "Les préférences doivent être modifiables de façon idempotente.");
assert.match(notificationPage, /Enregistrer mes préférences/, "Le client doit pouvoir gérer ses préférences de notification.");
assert.match(order, /queueInAppNotification/, "La création d’une commande doit notifier le client connecté.");
assert.match(adminOrders, /queueInAppNotification/, "Les changements de commande doivent notifier le client.");
assert.match(workshopPartsApi, /movement_type/, "La consommation atelier doit conserver son historique de stock.");
assert.match(adminAppointments, /customer_id=\$2/, "Un rendez-vous ne peut être lié qu’au véhicule du client sélectionné.");
assert.match(adminAppointments, /ura\.role='mechanic'/, "Seuls les membres affectés au rôle mécanicien peuvent recevoir un créneau.");
assert.match(adminAppointments, /export async function PATCH/, "Les rendez-vous doivent pouvoir être confirmés, déplacés ou annulés.");
assert.match(workshopApi, /customer_id=\$2/, "Un dossier atelier doit vérifier la propriété du véhicule client.");
assert.match(workshopApi, /customerApprovalNote/, "L’approbation d’un devis doit conserver l’accord du client.");
assert.match(workshopApi, /requireStaff\("mechanic"\)/, "La mise à jour technique d’un dossier doit être réservée au mécanicien.");
assert.match(expensePage, /supplierId:f\.get\("supplierId"\)/, "Les dépenses doivent pouvoir être associées à un fournisseur.");
assert.match(supplierApi, /requireStaff\("storekeeper","accountant"\)/, "Le comptable doit pouvoir lire les fournisseurs pour la saisie des dépenses.");
console.log("Contrôles réussis : inventaire traçable, créneaux atelier protégés, paiements vérifiés, stocks protégés, catalogue, équivalences, commandes, accès, devises, catégories, véhicules et normalisation des e-mails.");
