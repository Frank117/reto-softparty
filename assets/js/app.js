(function () {
    const HORA_EN_MS = 60 * 60 * 1000;
    const TARIFA_POR_HORA = 3000;
    const registros = [];

    const form = document.getElementById('formRegistro');
    const tablaBody = document.querySelector('#tablaRegistros tbody');
    const filtro = document.getElementById('filtro');
    const btnNuevaEntrada = document.getElementById('btnNuevaEntrada');
    const btnDescargarListado = document.getElementById('btnDescargarListado');
    const entradaInput = document.getElementById('entrada');

    setDefaultEntradaNow();

    btnNuevaEntrada.addEventListener('click', () => {
        setDefaultEntradaNow();
        document.getElementById('nombre').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btnDescargarListado.addEventListener('click', descargarListadoPDF);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
    
        const data = obtenerDatosFormulario();
    
        try {
            const res = await fetch('app/register_entry.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data)
            });
            const result = await res.json();
    
            if (result.success) {
                alert("✅ Entrada registrada en la base de datos");
                form.reset();
                setDefaultEntradaNow();
                // Recargar la tabla con datos actualizados desde la BD
                cargarRegistros();
            } else {
                alert("❌ Error: " + (result.error || result.message));
            }
        } catch (err) {
            console.error(err);
            alert("⚠️ Error al conectar con el servidor");
        }
    });
    

    filtro.addEventListener('input', renderTabla);

    function setDefaultEntradaNow() {
        const now = new Date();
        const tzOffset = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        entradaInput.value = tzOffset.toISOString().slice(0, 16);
    }

    function obtenerDatosFormulario() {
        return {
            nombre: document.getElementById('nombre').value.trim(),
            documento: document.getElementById('documento').value.trim(),
            contacto: document.getElementById('contacto').value.trim(),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value,
            entrada: document.getElementById('entrada').value
        };
    }

    function renderTabla() {
        const q = filtro.value.trim().toLowerCase();
        const data = registros.filter(r => !q || r.placa.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q) || r.documento.toLowerCase().includes(q));
        tablaBody.innerHTML = '';
        if (data.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7; td.textContent = 'Sin registros'; td.className = 'muted';
            tr.appendChild(td); tablaBody.appendChild(tr); return;
        }
        for (const r of data) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${r.placa}</strong></td>
                <td>${r.tipo}</td>
                <td>${r.nombre}</td>
                <td>${r.documento}</td>
                <td>${r.contacto}</td>
                <td>${formatDateTime(r.entrada)}</td>
                <td>
                    <button class="btn small" data-accion="facturar" data-id="${r.id}">Salida y factura</button>
                </td>
            `;
            tablaBody.appendChild(tr);
        }
        tablaBody.querySelectorAll('button[data-accion="facturar"]').forEach(btn => { btn.addEventListener('click', onFacturarClick); });
    }

    async function onFacturarClick(ev) {
        const id = ev.currentTarget.getAttribute('data-id');
        
        try {
            const res = await fetch('app/process_exit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ parking_id: id })
            });
            const result = await res.json();
            
            if (result.success) {
                const entrada = new Date(result.entry_time);
                const salida = new Date(result.exit_time);
                generarFacturaPDF({
                    placa: result.vehiculo.placa,
                    tipo: result.vehiculo.tipo,
                    nombre: result.vehiculo.dueño,
                    documento: result.vehiculo.documento,
                    contacto: result.vehiculo.telefono
                }, entrada, salida, result.hours, result.total, result.currency);
                
                // Recargar la tabla después de procesar la salida
                cargarRegistros();
            } else {
                alert("❌ Error: " + (result.error || "Error al procesar la salida"));
            }
        } catch (err) {
            console.error(err);
            alert("⚠️ Error al conectar con el servidor");
        }
    }

    function formatCurrency(num) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num); }
    
    function formatCurrencyWithCurrency(num, currency = 'COP') { 
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(num); 
    }

    function formatDateTime(value) {
        const d = new Date(value);
        return d.toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function generarFacturaPDF(reg, entrada, salida, horas, total, currency = 'COP') {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Factura Parqueadero', 14, 18);
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        doc.text(`Fecha de emisión: ${formatDateTime(new Date())}`, 14, 26);
        doc.text(`Tarifa por hora: ${formatCurrencyWithCurrency(TARIFA_POR_HORA, currency)}`, 14, 32);
        const datos = [ ['Nombre', reg.nombre], ['Documento', reg.documento], ['Contacto', reg.contacto], ['Placa', reg.placa], ['Tipo', reg.tipo], ['Entrada', formatDateTime(entrada)], ['Salida', formatDateTime(salida)], ['Tiempo facturado', `${horas} hora(s)`], ['Valor a pagar', formatCurrencyWithCurrency(total, currency)] ];
        if (doc.autoTable) { doc.autoTable({ startY: 40, head: [['Detalle', 'Valor']], body: datos, styles: { fontSize: 11 }, headStyles: { fillColor: [25, 118, 210] } }); }
        else { let y = 40; for (const [k, v] of datos) { doc.text(`${k}: ${v}`, 14, y); y += 8; } }
        const nombreArchivo = `Factura_${reg.placa}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
        doc.save(nombreArchivo);
    }

    function descargarListadoPDF() {
        if (registros.length === 0) { alert('No hay registros para descargar.'); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Listado actual de vehículos en parqueadero', 14, 18);
        const body = registros.map(r => [r.placa, r.tipo, r.nombre, r.documento, r.contacto, formatDateTime(r.entrada)]);
        if (doc.autoTable) { doc.autoTable({ startY: 26, head: [['Placa', 'Tipo', 'Dueño', 'Documento', 'Contacto', 'Entrada']], body, styles: { fontSize: 10 }, headStyles: { fillColor: [25, 118, 210] } }); }
        else { let y = 26; for (const row of body) { doc.text(row.join(' | '), 14, y); y += 8; } }
        const nombreArchivo = `Listado_Parqueadero_${new Date().toISOString().slice(0,10)}.pdf`; doc.save(nombreArchivo);
    }
})();
async function cargarRegistros() {
    try {
        const res = await fetch("app/get_current_parkings.php");
        const data = await res.json();

        tablaBody.innerHTML = "";

        if (!data || data.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="7" class="muted">Sin registros</td>`;
            tablaBody.appendChild(tr);
            return;
        }

        for (const r of data) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${r.plate}</strong></td>
                <td>${r.vehicle_type}</td>
                <td>${r.full_name}</td>
                <td>${r.document}</td>
                <td>${r.phone}</td>
                <td>${formatDateTime(r.entry_time)}</td>
                <td>
                    <button class="btn small" data-accion="facturar" data-id="${r.parking_id}">Salida y factura</button>
                </td>
            `;
            tablaBody.appendChild(tr);
        }
    } catch (err) {
        console.error("Error al cargar registros:", err);
    }
}

// Función para cargar la tarifa desde la BD
async function cargarTarifa() {
    try {
        const res = await fetch('app/get_settings.php');
        const data = await res.json();
        if (data.success) {
            const tarifaLabel = document.getElementById('tarifaLabel');
            if (tarifaLabel) {
                tarifaLabel.textContent = `${formatCurrencyWithCurrency(data.hourly_rate, data.currency)}/hora`;
            }
        }
    } catch (err) {
        console.error('Error al cargar tarifa:', err);
    }
}

// Llamar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    cargarRegistros();
    cargarTarifa();
});
