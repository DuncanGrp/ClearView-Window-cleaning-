/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  getFirestore
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

import {
  Booking,
  BookingStatus,
  BusinessSettings,
  CleanerProfile,
  CustomerProfile,
  ExtraOption,
  QuoteRequest,
  ServiceItem,
  UserRole,
  UserSession,
  AuditLog
} from './src/types';

import {
  INITIAL_SERVICES,
  INITIAL_EXTRAS,
  INITIAL_CLEANERS,
  INITIAL_CUSTOMERS,
  INITIAL_SETTINGS,
  INITIAL_BOOKINGS,
  INITIAL_QUOTES
} from './src/data';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Define Database Schema in memory / file
interface AppDatabase {
  services: ServiceItem[];
  extras: ExtraOption[];
  cleaners: CleanerProfile[];
  customers: CustomerProfile[];
  settings: BusinessSettings;
  bookings: Booking[];
  quotes: QuoteRequest[];
  auditLogs: AuditLog[];
  currentSession: UserSession;
}

// Default initial state
const defaultDb: AppDatabase = {
  services: INITIAL_SERVICES,
  extras: INITIAL_EXTRAS,
  cleaners: INITIAL_CLEANERS,
  customers: INITIAL_CUSTOMERS,
  settings: INITIAL_SETTINGS,
  bookings: INITIAL_BOOKINGS,
  quotes: INITIAL_QUOTES,
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      user: 'System',
      role: 'ADMIN',
      action: 'Database Initialized',
      details: 'Window cleaning business management database created with mock data.'
    }
  ],
  currentSession: {
    role: 'GUEST',
    userId: 'guest-1',
    name: 'Guest Visitor',
    email: ''
  }
};

// Memory Cache
let dbCache: AppDatabase = { ...defaultDb };

// Firebase / Firestore setup
let firestore: any = null;
let serverAuth: any = null;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: serverAuth?.currentUser?.uid || null,
      email: serverAuth?.currentUser?.email || null,
      emailVerified: serverAuth?.currentUser?.emailVerified || null,
      isAnonymous: serverAuth?.currentUser?.isAnonymous || null,
      tenantId: serverAuth?.currentUser?.tenantId || null,
      providerInfo: serverAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const firebaseApp = initializeApp(firebaseConfig);
    firestore = firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(firebaseApp, {}, firebaseConfig.firestoreDatabaseId)
      : getFirestore(firebaseApp);
    serverAuth = getAuth(firebaseApp);
    
    console.log('Firebase successfully initialized for server.');
  } else {
    console.warn('firebase-applet-config.json not found. Firestore will be disabled.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase:', err);
}

// Helper to clean undefined fields for Firestore compatibility
function cleanData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(cleanData);
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val !== undefined) {
        cleaned[key] = cleanData(val);
      }
    }
    return cleaned;
  }
  return data;
}

// Write helper for Firestore
async function saveFirestoreDoc(collectionName: string, docId: string, data: any) {
  if (!firestore) return;
  await ensureAuthenticated();
  const fullPath = `${collectionName}/${docId}`;
  try {
    const docRef = doc(firestore, collectionName, docId);
    await setDoc(docRef, cleanData(data));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, fullPath);
  }
}

// Delete helper for Firestore
async function deleteFirestoreDoc(collectionName: string, docId: string) {
  if (!firestore) return;
  await ensureAuthenticated();
  const fullPath = `${collectionName}/${docId}`;
  try {
    const docRef = doc(firestore, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, fullPath);
  }
}

// Seed default data in Firestore
async function seedFirestoreDefaultData() {
  if (!firestore) return;
  try {
    console.log('Seeding default data in Firestore...');
    const batch = writeBatch(firestore);

    // Seed services
    defaultDb.services.forEach(item => {
      batch.set(doc(firestore, 'services', item.id), cleanData(item));
    });

    // Seed extras
    defaultDb.extras.forEach(item => {
      batch.set(doc(firestore, 'extras', item.id), cleanData(item));
    });

    // Seed cleaners
    defaultDb.cleaners.forEach(item => {
      batch.set(doc(firestore, 'cleaners', item.id), cleanData(item));
    });

    // Seed customers
    defaultDb.customers.forEach(item => {
      batch.set(doc(firestore, 'customers', item.id), cleanData(item));
    });

    // Seed settings
    batch.set(doc(firestore, 'settings', 'business'), cleanData(defaultDb.settings));

    // Seed bookings
    defaultDb.bookings.forEach(item => {
      batch.set(doc(firestore, 'bookings', item.id), cleanData(item));
    });

    // Seed quotes
    defaultDb.quotes.forEach(item => {
      batch.set(doc(firestore, 'quotes', item.id), cleanData(item));
    });

    // Seed auditLogs
    defaultDb.auditLogs.forEach(item => {
      batch.set(doc(firestore, 'auditLogs', item.id), cleanData(item));
    });

    // Seed currentSession
    batch.set(doc(firestore, 'session', 'current'), cleanData(defaultDb.currentSession));

    await batch.commit();
    console.log('Seeding complete!');
    dbCache = { ...defaultDb };
  } catch (err) {
    console.error('Failed to seed default data in Firestore:', err);
  }
}

// Read database from local file if needed
function readDbLocal(): AppDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading db.json, using default database', err);
  }
  return defaultDb;
}

// Secure server-side Firebase Authentication as a system service account
async function authenticateServer() {
  if (!firestore || !serverAuth) return;
  try {
    const email = 'server@clearviewpro.internal';
    const password = 'secureServerPassword123!';
    try {
      await signInWithEmailAndPassword(serverAuth, email, password);
      console.log('Firebase Server successfully authenticated as system.');
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/cannot-find-user-locally' || 
        err.code === 'auth/user-disabled'
      ) {
        console.log('System account not found or credentials invalid. Registering system account...');
        await createUserWithEmailAndPassword(serverAuth, email, password);
        console.log('Firebase Server successfully registered and authenticated as system.');
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('Failed to authenticate Firebase Server:', err);
  }
}

let serverAuthAttempted = false;

// Ensure the system service account is logged in before executing database operations
async function ensureAuthenticated() {
  if (!firestore || !serverAuth) return;
  if (serverAuth.currentUser && serverAuth.currentUser.email === 'server@clearviewpro.internal') {
    return;
  }
  if (serverAuthAttempted) return;
  serverAuthAttempted = true;
  await authenticateServer();
}

// Sync Firestore data on startup
async function syncFromFirestore() {
  if (!firestore) {
    console.log('Using local db.json cache because Firestore is not configured.');
    dbCache = readDbLocal();
    return;
  }

  // Authenticate as server system user before performing operations
  await ensureAuthenticated();

  try {
    console.log('Syncing database cache with Firestore...');
    
    const [
      servicesSnapshot,
      extrasSnapshot,
      cleanersSnapshot,
      customersSnapshot,
      bookingsSnapshot,
      quotesSnapshot,
      logsSnapshot,
      settingsSnapshot,
      sessionSnapshot
    ] = await Promise.all([
      getDocs(collection(firestore, 'services')),
      getDocs(collection(firestore, 'extras')),
      getDocs(collection(firestore, 'cleaners')),
      getDocs(collection(firestore, 'customers')),
      getDocs(collection(firestore, 'bookings')),
      getDocs(collection(firestore, 'quotes')),
      getDocs(collection(firestore, 'auditLogs')),
      getDocs(collection(firestore, 'settings')),
      getDocs(collection(firestore, 'session'))
    ]);

    const servicesList: ServiceItem[] = [];
    servicesSnapshot.forEach(doc => servicesList.push(doc.data() as ServiceItem));

    const extrasList: ExtraOption[] = [];
    extrasSnapshot.forEach(doc => extrasList.push(doc.data() as ExtraOption));

    const cleanersList: CleanerProfile[] = [];
    cleanersSnapshot.forEach(doc => cleanersList.push(doc.data() as CleanerProfile));

    const customersList: CustomerProfile[] = [];
    customersSnapshot.forEach(doc => customersList.push(doc.data() as CustomerProfile));

    const bookingsList: Booking[] = [];
    bookingsSnapshot.forEach(doc => bookingsList.push(doc.data() as Booking));

    const quotesList: QuoteRequest[] = [];
    quotesSnapshot.forEach(doc => quotesList.push(doc.data() as QuoteRequest));

    const logsList: AuditLog[] = [];
    logsSnapshot.forEach(doc => logsList.push(doc.data() as AuditLog));

    let settingsObj: BusinessSettings | null = null;
    settingsSnapshot.forEach(doc => {
      if (doc.id === 'business') {
        settingsObj = doc.data() as BusinessSettings;
      }
    });

    let sessionObj: UserSession | null = null;
    sessionSnapshot.forEach(doc => {
      if (doc.id === 'current') {
        sessionObj = doc.data() as UserSession;
      }
    });

    const isDbEmpty = servicesList.length === 0 && bookingsList.length === 0 && customersList.length === 0;

    if (isDbEmpty) {
      console.log('Firestore is empty. Seeding defaults...');
      await seedFirestoreDefaultData();
    } else {
      dbCache = {
        services: servicesList,
        extras: extrasList,
        cleaners: cleanersList,
        customers: customersList,
        settings: settingsObj || defaultDb.settings,
        bookings: bookingsList,
        quotes: quotesList,
        auditLogs: logsList.length > 0 ? logsList : defaultDb.auditLogs,
        currentSession: sessionObj || defaultDb.currentSession
      };
      
      // Sort collections
      dbCache.bookings.sort((a, b) => b.id.localeCompare(a.id));
      dbCache.quotes.sort((a, b) => b.id.localeCompare(a.id));
      dbCache.auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      console.log('Database synced with Firestore. Loaded collections successfully!');
    }
  } catch (err) {
    console.error('Failed to load data from Firestore:', err);
    console.log('Falling back to local db.json.');
    dbCache = readDbLocal();
  }
}

// Database utility functions
function readDb(): AppDatabase {
  return dbCache;
}

function writeDb(db: AppDatabase) {
  dbCache = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db.json', err);
  }
}

// Log an action helper
function addAuditLog(db: AppDatabase, user: string, role: UserRole, action: string, details: string) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    user,
    role,
    action,
    details
  };
  db.auditLogs.unshift(log); // newest first
  if (db.auditLogs.length > 100) {
    const oldestLog = db.auditLogs.pop();
    if (oldestLog) {
      deleteFirestoreDoc('auditLogs', oldestLog.id);
    }
  }
  saveFirestoreDoc('auditLogs', log.id, log);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- API ROUTES ---

// 1. Session Endpoints
app.get('/api/session', (req, res) => {
  const db = readDb();
  res.json(db.currentSession);
});

app.post('/api/session/switch', async (req, res) => {
  const { role, userId, name, email, phone, addresses } = req.body;
  const db = readDb();
  
  db.currentSession = {
    role: role || 'GUEST',
    userId: userId || 'guest-1',
    name: name || 'Guest User',
    email: email || '',
    phone,
    addresses
  };
  
  addAuditLog(
    db,
    db.currentSession.name,
    db.currentSession.role,
    'Session Switched',
    `Role changed to ${db.currentSession.role} (${db.currentSession.name})`
  );
  
  writeDb(db);
  await saveFirestoreDoc('session', 'current', db.currentSession);
  res.json(db.currentSession);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const db = readDb();

  // 1. Check Owner / Admin credentials
  if (email.toLowerCase() === 'ownertest@clearview.com' && password === 'admin123') {
    db.currentSession = {
      role: 'ADMIN',
      userId: 'admin-1',
      name: 'Thomas Higgins',
      email: 'ownertest@clearview.com'
    };

    addAuditLog(
      db,
      db.currentSession.name,
      'ADMIN',
      'Portal Login',
      'Business Owner authenticated successfully.'
    );

    writeDb(db);
    await saveFirestoreDoc('session', 'current', db.currentSession);
    return res.json(db.currentSession);
  }

  // 2. Check Cleaner credentials
  const cleaner = db.cleaners.find((c: any) => c.email.toLowerCase() === email.toLowerCase());
  if (cleaner) {
    db.currentSession = {
      role: 'CLEANER',
      userId: cleaner.id,
      name: cleaner.name,
      email: cleaner.email,
      phone: cleaner.phone
    };

    addAuditLog(
      db,
      cleaner.name,
      'CLEANER',
      'Portal Login',
      `Technician ${cleaner.name} logged into technician portal.`
    );

    writeDb(db);
    await saveFirestoreDoc('session', 'current', db.currentSession);
    return res.json(db.currentSession);
  }

  // 3. Check Customer credentials
  const customer = db.customers.find((c: any) => c.email.toLowerCase() === email.toLowerCase());
  if (customer) {
    db.currentSession = {
      role: 'CUSTOMER',
      userId: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses
    };

    addAuditLog(
      db,
      customer.name,
      'CUSTOMER',
      'Portal Login',
      `Customer ${customer.name} logged into customer portal.`
    );

    writeDb(db);
    await saveFirestoreDoc('session', 'current', db.currentSession);
    return res.json(db.currentSession);
  }

  return res.status(401).json({ message: 'Invalid portal credentials or user not found.' });
});

// 2. Services & Extras
app.get('/api/services', (req, res) => {
  const db = readDb();
  res.json({ services: db.services, extras: db.extras });
});

app.post('/api/services', async (req, res) => {
  const db = readDb();
  const newService: ServiceItem = {
    id: `srv-${Date.now()}`,
    name: req.body.name,
    description: req.body.description,
    category: req.body.category || 'domestic',
    basePrice: Number(req.body.basePrice) || 0
  };
  db.services.push(newService);
  addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Service Created', `Added service: ${newService.name}`);
  writeDb(db);
  await saveFirestoreDoc('services', newService.id, newService);
  res.json(newService);
});

app.put('/api/services/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const idx = db.services.findIndex(s => s.id === id);
  if (idx !== -1) {
    db.services[idx] = {
      ...db.services[idx],
      name: req.body.name,
      description: req.body.description,
      category: req.body.category || db.services[idx].category,
      basePrice: Number(req.body.basePrice)
    };
    addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Service Updated', `Updated service: ${db.services[idx].name}`);
    writeDb(db);
    await saveFirestoreDoc('services', id, db.services[idx]);
    res.json(db.services[idx]);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const srv = db.services.find(s => s.id === id);
  if (srv) {
    db.services = db.services.filter(s => s.id !== id);
    addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Service Deleted', `Removed service: ${srv.name}`);
    writeDb(db);
    await deleteFirestoreDoc('services', id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// 3. Cleaners Endpoints
app.get('/api/cleaners', (req, res) => {
  const db = readDb();
  res.json(db.cleaners);
});

app.post('/api/cleaners', async (req, res) => {
  const db = readDb();
  const newCleaner: CleanerProfile = {
    id: `cln-${Date.now()}`,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    status: req.body.status || 'active',
    rating: 5.0,
    completedJobsCount: 0
  };
  db.cleaners.push(newCleaner);
  addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Cleaner Added', `Registered cleaner: ${newCleaner.name}`);
  writeDb(db);
  await saveFirestoreDoc('cleaners', newCleaner.id, newCleaner);
  res.json(newCleaner);
});

app.put('/api/cleaners/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const idx = db.cleaners.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.cleaners[idx] = {
      ...db.cleaners[idx],
      name: req.body.name || db.cleaners[idx].name,
      email: req.body.email || db.cleaners[idx].email,
      phone: req.body.phone || db.cleaners[idx].phone,
      status: req.body.status || db.cleaners[idx].status
    };
    addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Cleaner Updated', `Updated cleaner profile: ${db.cleaners[idx].name}`);
    writeDb(db);
    await saveFirestoreDoc('cleaners', id, db.cleaners[idx]);
    res.json(db.cleaners[idx]);
  } else {
    res.status(404).json({ error: 'Cleaner not found' });
  }
});

// 4. Customers Endpoints
app.get('/api/customers', (req, res) => {
  const db = readDb();
  res.json(db.customers);
});

app.post('/api/customers/register', async (req, res) => {
  const db = readDb();
  const { name, email, phone, address } = req.body;
  
  // Check if exists
  let customer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (customer) {
    // Return existing
    res.json(customer);
    return;
  }
  
  customer = {
    id: `cust-${Date.now()}`,
    name,
    email,
    phone,
    addresses: [address],
    createdAt: new Date().toISOString()
  };
  db.customers.push(customer);
  addAuditLog(db, name, 'CUSTOMER', 'Customer Self-Registration', `Customer signed up: ${name} (${email})`);
  writeDb(db);
  await saveFirestoreDoc('customers', customer.id, customer);
  res.json(customer);
});

app.put('/api/customers/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const idx = db.customers.findIndex(c => c.id === id);
  if (idx !== -1) {
    db.customers[idx] = {
      ...db.customers[idx],
      name: req.body.name || db.customers[idx].name,
      phone: req.body.phone || db.customers[idx].phone,
      addresses: req.body.addresses || db.customers[idx].addresses,
      propertyDetails: req.body.propertyDetails || db.customers[idx].propertyDetails,
      notes: req.body.notes || db.customers[idx].notes
    };
    addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Customer Profile Updated', `Updated customer details for: ${db.customers[idx].name}`);
    writeDb(db);
    await saveFirestoreDoc('customers', id, db.customers[idx]);
    res.json(db.customers[idx]);
  } else {
    res.status(404).json({ error: 'Customer not found' });
  }
});

// 5. Bookings Endpoints
app.get('/api/bookings', (req, res) => {
  const db = readDb();
  res.json(db.bookings);
});

app.post('/api/bookings', async (req, res) => {
  const db = readDb();
  const {
    customerName,
    customerEmail,
    customerPhone,
    address,
    propertyType,
    windowsCount,
    floorsCount,
    serviceId,
    extras,
    frequency,
    date,
    timeSlot,
    price,
    notes,
    gateCode,
    parkingInfo,
    hasDog
  } = req.body;

  const service = db.services.find(s => s.id === serviceId) || db.services[0];

  const newBooking: Booking = {
    id: `job-${Date.now()}`,
    customerName,
    customerEmail,
    customerPhone,
    address,
    propertyType,
    windowsCount: Number(windowsCount),
    floorsCount: Number(floorsCount),
    serviceId,
    serviceName: service.name,
    extras: extras || [],
    frequency,
    date,
    timeSlot,
    status: 'pending',
    price: Number(price),
    notes: notes || '',
    gateCode,
    parkingInfo,
    hasDog: !!hasDog,
    beforePhotos: [],
    afterPhotos: [],
    createdAt: new Date().toISOString()
  };

  db.bookings.unshift(newBooking); // Add to beginning of array

  // Check if customer email exists in client list; if not, add them automatically
  let cust = db.customers.find(c => c.email.toLowerCase() === customerEmail.toLowerCase());
  if (!cust) {
    cust = {
      id: `cust-${Date.now()}`,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      addresses: [address],
      createdAt: new Date().toISOString()
    };
    db.customers.push(cust);
    await saveFirestoreDoc('customers', cust.id, cust);
  } else {
    // Add address if new
    if (!cust.addresses.includes(address)) {
      cust.addresses.push(address);
      await saveFirestoreDoc('customers', cust.id, cust);
    }
  }

  addAuditLog(
    db,
    db.currentSession.name,
    db.currentSession.role,
    'Booking Created',
    `New appointment for ${customerName} on ${date} (${newBooking.id})`
  );

  writeDb(db);
  await saveFirestoreDoc('bookings', newBooking.id, newBooking);
  res.json(newBooking);
});

app.put('/api/bookings/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx !== -1) {
    const originalStatus = db.bookings[idx].status;
    const update = req.body;
    
    // Merge updates
    db.bookings[idx] = {
      ...db.bookings[idx],
      ...update
    };

    // Auto-fill cleaner name if cleanerId changes
    if (update.cleanerId && update.cleanerId !== db.bookings[idx].cleanerId) {
      const cleaner = db.cleaners.find(c => c.id === update.cleanerId);
      if (cleaner) {
        db.bookings[idx].cleanerName = cleaner.name;
        // Auto transition pending -> assigned if cleaner is set
        if (db.bookings[idx].status === 'pending') {
          db.bookings[idx].status = 'assigned';
        }
      }
    }

    // Handle invoice generation on complete
    let clnIdx = -1;
    if (db.bookings[idx].status === 'completed' && originalStatus !== 'completed') {
      db.bookings[idx].invoiceId = `INV-2026-${db.bookings[idx].id.split('-')[1] || Math.floor(Math.random() * 1000)}`;
      // Increment completed jobs on cleaner profile
      if (db.bookings[idx].cleanerId) {
        clnIdx = db.cleaners.findIndex(c => c.id === db.bookings[idx].cleanerId);
        if (clnIdx !== -1) {
          db.cleaners[clnIdx].completedJobsCount += 1;
        }
      }
    }

    addAuditLog(
      db,
      db.currentSession.name,
      db.currentSession.role,
      'Booking Updated',
      `Booking ${id} status updated from ${originalStatus} to ${db.bookings[idx].status}`
    );

    writeDb(db);
    
    const savePromises = [saveFirestoreDoc('bookings', id, db.bookings[idx])];
    if (clnIdx !== -1) {
      savePromises.push(saveFirestoreDoc('cleaners', db.bookings[idx].cleanerId, db.cleaners[clnIdx]));
    }
    await Promise.all(savePromises);
    
    res.json(db.bookings[idx]);
  } else {
    res.status(404).json({ error: 'Booking not found' });
  }
});

// Weather postpone batch endpoint (Admin calendar)
app.post('/api/bookings/bulk-postpone', async (req, res) => {
  const db = readDb();
  const { date, newDate, reason } = req.body;
  let affectedCount = 0;
  const updatedBookings: Booking[] = [];

  db.bookings = db.bookings.map(b => {
    if (b.date === date && b.status !== 'completed' && b.status !== 'cancelled') {
      affectedCount++;
      const updated = {
        ...b,
        date: newDate,
        status: 'rain_delay' as BookingStatus,
        notes: `${b.notes ? b.notes + '\n' : ''}[Weather Postponed from ${date}: ${reason || 'Rain Alert'}]`
      };
      updatedBookings.push(updated);
      return updated;
    }
    return b;
  });

  if (affectedCount > 0) {
    addAuditLog(
      db,
      db.currentSession.name,
      db.currentSession.role,
      'Bulk Postponement',
      `Postponed ${affectedCount} appointments from ${date} to ${newDate} due to weather.`
    );
    writeDb(db);
    
    const savePromises = updatedBookings.map(b => saveFirestoreDoc('bookings', b.id, b));
    await Promise.all(savePromises);
  }

  res.json({ success: true, affectedCount });
});

// 6. Quotes Endpoints
app.get('/api/quotes', (req, res) => {
  const db = readDb();
  res.json(db.quotes);
});

app.post('/api/quotes', async (req, res) => {
  const db = readDb();
  const {
    customerName,
    customerEmail,
    customerPhone,
    address,
    propertyType,
    windowsCount,
    floorsCount,
    extras,
    frequency,
    notes,
    estimatedPrice
  } = req.body;

  const newQuote: QuoteRequest = {
    id: `qte-${Date.now()}`,
    customerName,
    customerEmail,
    customerPhone,
    address,
    propertyType,
    windowsCount: Number(windowsCount),
    floorsCount: Number(floorsCount),
    extras: extras || [],
    frequency,
    notes: notes || '',
    estimatedPrice: Number(estimatedPrice),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.quotes.unshift(newQuote);

  addAuditLog(
    db,
    db.currentSession.name,
    db.currentSession.role,
    'Quote Requested',
    `New quote request for ${customerName} ($${estimatedPrice})`
  );

  writeDb(db);
  await saveFirestoreDoc('quotes', newQuote.id, newQuote);
  res.json(newQuote);
});

app.put('/api/quotes/:id', async (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const idx = db.quotes.findIndex(q => q.id === id);
  if (idx !== -1) {
    db.quotes[idx] = {
      ...db.quotes[idx],
      ...req.body
    };

    addAuditLog(
      db,
      db.currentSession.name,
      db.currentSession.role,
      'Quote Updated',
      `Quote ${id} updated to status: ${db.quotes[idx].status}`
    );

    writeDb(db);
    await saveFirestoreDoc('quotes', id, db.quotes[idx]);
    res.json(db.quotes[idx]);
  } else {
    res.status(404).json({ error: 'Quote not found' });
  }
});

// 7. Company Settings Endpoints
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings);
});

app.put('/api/settings', async (req, res) => {
  const db = readDb();
  db.settings = {
    ...db.settings,
    ...req.body
  };
  addAuditLog(db, db.currentSession.name, db.currentSession.role, 'Settings Updated', 'Company operational configurations updated.');
  writeDb(db);
  await saveFirestoreDoc('settings', 'business', db.settings);
  res.json(db.settings);
});

// 8. Audit Logs
app.get('/api/logs', (req, res) => {
  const db = readDb();
  res.json(db.auditLogs);
});

// --- PLATFORM DEV SERVER AND PRODUCTION HANDLING ---

async function startServer() {
  await syncFromFirestore();

  if (process.env.NODE_ENV !== 'production') {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    // Mount Vite middleware
    app.use(vite.middlewares);
    console.log('Vite development server middleware integrated.');
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-ready static assets from dist/.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
