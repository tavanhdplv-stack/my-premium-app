const fs = require('fs');
const file = 'c:/Users/Acer/OneDrive/Desktop/my-first-webapp/my-premium-app/app/components/OrderForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add getDoc
if (!content.includes('getDoc')) {
  content = content.replace('updateDoc, increment }', 'updateDoc, increment, getDoc }');
}

// 2. Add useEffect
const useEffectCode = `
  useEffect(() => {
    if (editId) {
      const fetchOrder = async () => {
        setLoading(true);
        try {
          const docSnap = await getDoc(doc(db, 'orders', editId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCustomerName(data.customerName || '');
            setPhone(data.phone || '');
            setTransport(data.transport || TRANSPORTS[0]);
            setVillage(data.village || '');
            setDistrict(data.district || '');
            setProvince(data.province || PROVINCES[0]);
            setOrderDate(data.orderDate || new Date().toLocaleDateString('en-GB'));
            setStatus(data.status || STATUSES[0]);
            setWallet(data.wallet || '');
            setPaymentMethod(data.paymentMethod || 'COD');
            setDeposit(data.deposit?.toString() || '');
            setShippingFee(data.shippingFee?.toString() || '');
            setItems(data.items || [{ id: Date.now().toString(), name: '', qty: 1, cost: 0, price: 0 }]);
            setExpenses(data.expenses || []);
            setImageUrl(data.imageUrl || '');
            setAgentId(data.agentId || '');
            setOrderedBy(data.orderedBy || '');
          }
        } catch (error) {
          console.error("Error fetching order:", error);
          setMessage({ type: 'error', text: '❌ ບໍ່ສາມາດໂຫຼດຂໍ້ມູນອໍເດີເກົ່າໄດ້' });
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [editId]);
`;

if (!content.includes('const fetchOrder = async')) {
  content = content.replace(
    'const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);',
    'const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);\\n' + useEffectCode
  );
}

// 3. Update handleSave
const oldHandleSave = `      await addDoc(collection(db, 'orders'), {
        customerName: customerName || 'ລູກຄ້າທົ່ວໄປ',
        productName: firstItem.name,
        size: 'N/A',
        price: Number(totalSales),
        paymentMethod: paymentMethod,
        status: status,
        createdAt: serverTimestamp(),
        phone, transport, village, district, province, orderDate, wallet,
        deposit: Number(deposit) || 0,
        shippingFee: totalShipping,
        items: items,
        expenses: expenses,
        totalCost,
        totalProfit,
        totalExpenses,
        imageUrl: imageUrl || '',
        agentId: agentId || null,
        isPreOrder: agentId ? true : false,
        orderedBy: orderedBy || '',
      });
      
      if (agentId && totalSales > 0) {
        const agentRef = doc(db, 'agents', agentId);
        await updateDoc(agentRef, {
          totalSales: increment(totalSales)
        });
      }`;

const newHandleSave = `      const orderData = {
        customerName: customerName || 'ລູກຄ້າທົ່ວໄປ',
        productName: firstItem.name,
        size: 'N/A',
        price: Number(totalSales),
        paymentMethod: paymentMethod,
        status: status,
        phone, transport, village, district, province, orderDate, wallet,
        deposit: Number(deposit) || 0,
        shippingFee: totalShipping,
        items: items,
        expenses: expenses,
        totalCost,
        totalProfit,
        totalExpenses,
        imageUrl: imageUrl || '',
        agentId: agentId || null,
        isPreOrder: agentId ? true : false,
        orderedBy: orderedBy || '',
      };

      if (editId) {
        await updateDoc(doc(db, 'orders', editId), {
          ...orderData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'orders'), {
          ...orderData,
          createdAt: serverTimestamp()
        });
        
        if (agentId && totalSales > 0) {
          const agentRef = doc(db, 'agents', agentId);
          await updateDoc(agentRef, {
            totalSales: increment(totalSales)
          });
        }
      }`;

if (content.includes('await addDoc(collection(db, \\'orders\\')')) {
  content = content.replace(oldHandleSave, newHandleSave);
}

fs.writeFileSync(file, content, 'utf8');
console.log('OrderForm patched successfully!');
