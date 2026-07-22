import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCt824TiWCYBTKZ6l3tsLXTo44-yQT6OBY",
  authDomain: "preorderapp-5f24f.firebaseapp.com",
  projectId: "preorderapp-5f24f",
  storageBucket: "preorderapp-5f24f.firebasestorage.app",
  messagingSenderId: "1039947560682",
  appId: "1:1039947560682:web:165cb159219c3e7cd68993",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const snap = await getDocs(collection(db, "orders"));
  console.log(`Found ${snap.size} orders to check.`);

  const batchSize = 100;
  let batch = writeBatch(db);
  let count = 0;
  let migratedCount = 0;

  for (const document of snap.docs) {
    const data = document.data();
    
    // Check if it's the old schema (has capitalized CustomerName or Status)
    if (data.CustomerName !== undefined || data.Status !== undefined || data.Date !== undefined) {
      
      const newItems = [];
      if (data.Product) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: data.Product || "",
          qty: Number(data.Quantity) || 1,
          cost: Number(data['ຕົ້ນທຶນ/ໜ່ວຍ'] || data.CostPrice) || 0,
          price: (Number(data.SellingPrice) || 0) / (Number(data.Quantity) || 1)
        });
      }

      const updateData = {
        customerName: data.CustomerName || "",
        phone: data.Phone || "",
        transport: data.Transport || "",
        village: data.Village || "",
        district: data.District || "",
        province: data.Province || "",
        orderDate: data.Date || data["ວັນທີ"] || "",
        status: data.Status || data["ສະຖານະ"] || "ລໍຖ້າເຄື່ອງ",
        paymentMethod: data.PaymentMethod || "COD",
        wallet: data.WalletID || "W-COMP",
        deposit: Number(data.DepositAmount || data["ຍອດມັດຈຳ"]) || 0,
        shippingFee: Number(data.OrderShippingFee) || 0,
        totalCost: Number(data.CostPrice) || 0,
        totalExpenses: Number(data.AdditionalCost) || 0,
        totalProfit: Number(data.NetProfit) || 0,
        totalSales: Number(data.SellingPrice) || 0,
        items: newItems,
        createdAtClient: data.CostUpdatedAt || Date.now(),
        // We do NOT delete the old fields just in case, but we could.
        // Actually, deleting them is cleaner, but let's just add the new ones for safety.
      };

      const docRef = doc(db, "orders", document.id);
      batch.update(docRef, updateData);
      migratedCount++;
      count++;

      if (count >= batchSize) {
        await batch.commit();
        console.log(`Committed ${count} updates...`);
        batch = writeBatch(db);
        count = 0;
      }
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Committed final ${count} updates...`);
  }

  console.log(`Migration complete! Migrated ${migratedCount} orders.`);
}

migrate().catch(console.error);
