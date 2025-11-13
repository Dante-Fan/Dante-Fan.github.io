import React, { useMemo, useState } from "react";

// Dante Flows Calculator — Baseline Estimator
// Assumptions implemented:
// 1) Unicast: audio subscriptions create 4‑channel transmit/receive flows. Flows used = ceil(channels/4) per Tx-Rx pair.
// 2) Multicast: one transmit flow per multicast connection regardless of number of receivers; each receiver consumes 1 receive flow per subscribed multicast flow.
// 3) Each device has independent Tx/Rx flow limits. The tool flags overruns.
// 4) This is a planning estimator — actual device limits vary by model/firmware.

function ceilDiv(a: number, b: number) {
  return Math.floor((a + b - 1) / b);
}

type Device = {
  id: string;
  name: string;
  txCap: number; // transmit flows capacity
  rxCap: number; // receive flows capacity
};

type Connection = {
  id: string;
  txId: string; // transmitter device id
  rxIds: string[]; // one or more receivers
  channels: number; // number of audio channels in the subscription
  mode: "unicast" | "multicast";
  multicastSize?: 8 | 16 | 32 | 64; // informational only; Rx still 1 flow per sub
  note?: string;
};

export default function DanteFlowsCalculator() {
  const [devices, setDevices] = useState<Device[]>([
    { id: crypto.randomUUID(), name: "TX-1 (Example)", txCap: 32, rxCap: 32 },
    { id: crypto.randomUUID(), name: "RX-1 (Example)", txCap: 32, rxCap: 32 },
    { id: crypto.randomUUID(), name: "RX-2 (Example)", txCap: 32, rxCap: 32 },
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);

  const [newDevice, setNewDevice] = useState<Partial<Device>>({
    name: "",
    txCap: 32,
    rxCap: 32,
  });

  const [newConn, setNewConn] = useState<Partial<Connection>>({
    txId: "",
    rxIds: [],
    channels: 4,
    mode: "unicast",
    multicastSize: 8,
    note: "",
  });

  // Compute flows used per device
  const flowUsage = useMemo(() => {
    const txUsed: Record<string, number> = {};
    const rxUsed: Record<string, number> = {};

    devices.forEach((d) => {
      txUsed[d.id] = 0;
      rxUsed[d.id] = 0;
    });

    connections.forEach((c) => {
      if (!c.txId) return;
      if (c.mode === "unicast") {
        const needed = ceilDiv(Math.max(1, c.channels || 1), 4);
        // each receiver consumes its own unicast flows from the transmitter
        (c.rxIds || []).forEach((rid) => {
          txUsed[c.txId] += needed;
          rxUsed[rid] += needed;
        });
      } else {
        // multicast: one TX flow total; each receiver 1 RX flow subscription
        txUsed[c.txId] += 1;
        (c.rxIds || []).forEach((rid) => {
          rxUsed[rid] += 1;
        });
      }
    });

    return { txUsed, rxUsed };
  }, [devices, connections]);

  const totals = useMemo(() => {
    const totalTx = Object.values(flowUsage.txUsed).reduce((a, b) => a + b, 0);
    const totalRx = Object.values(flowUsage.rxUsed).reduce((a, b) => a + b, 0);
    return { totalTx, totalRx };
  }, [flowUsage]);

  const addDevice = () => {
    if (!newDevice.name) return;
    setDevices((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newDevice.name!,
        txCap: Number(newDevice.txCap ?? 32),
        rxCap: Number(newDevice.rxCap ?? 32),
      },
    ]);
    setNewDevice({ name: "", txCap: 32, rxCap: 32 });
  };

  const removeDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    // remove any connections that reference the device
    setConnections((prev) =>
      prev
        .map((c) => ({
          ...c,
          rxIds: (c.rxIds || []).filter((rid) => rid !== id),
        }))
        .filter((c) => c.txId !== id && (c.rxIds?.length || 0) > 0)
    );
  };

  const addConnection = () => {
    if (!newConn.txId || !newConn.rxIds || newConn.rxIds.length === 0) return;
    const conn: Connection = {
      id: crypto.randomUUID(),
      txId: newConn.txId!,
      rxIds: [...(newConn.rxIds as string[])],
      channels: Number(newConn.channels || 1),
      mode: (newConn.mode as "unicast" | "multicast") || "unicast",
      multicastSize: (newConn.multicastSize as 8 | 16 | 32 | 64) || 8,
      note: newConn.note || "",
    };
    setConnections((prev) => [...prev, conn]);
    setNewConn({ txId: "", rxIds: [], channels: 4, mode: "unicast", multicastSize: 8, note: "" });
  };

  const removeConnection = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const updateDeviceField = (id: string, field: keyof Device, value: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: Number(value) || 0 } : d))
    );
  };

  const classWarn = "text-red-600 font-semibold";
  const classOk = "text-emerald-700";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dante Flows Calculator — Baseline Estimator</h1>
        <div className="text-sm text-gray-500">
          Planner v1 · 4‑ch unicast / 8–64 ch multicast model
        </div>
      </header>

      {/* Devices Section */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 p-4 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Add Device</h2>
          <div className="space-y-3">
            <label className="block text-sm">Name</label>
            <input
              className="w-full border rounded-xl p-2"
              placeholder="e.g., StageRack‑A"
              value={newDevice.name || ""}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Tx Flow Cap</label>
                <input
                  type="number"
                  className="w-full border rounded-xl p-2"
                  value={newDevice.txCap as number}
                  onChange={(e) => setNewDevice({ ...newDevice, txCap: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm">Rx Flow Cap</label>
                <input
                  type="number"
                  className="w-full border rounded-xl p-2"
                  value={newDevice.rxCap as number}
                  onChange={(e) => setNewDevice({ ...newDevice, rxCap: Number(e.target.value) })}
                />
              </div>
            </div>
            <button onClick={addDevice} className="w-full rounded-xl bg-black text-white py-2">Add Device</button>
          </div>
        </div>

        <div className="md:col-span-2 p-4 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Devices</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">Name</th>
                  <th className="p-2">Tx Used / Cap</th>
                  <th className="p-2">Rx Used / Cap</th>
                  <th className="p-2">Edit Caps</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const txUsed = flowUsage.txUsed[d.id] ?? 0;
                  const rxUsed = flowUsage.rxUsed[d.id] ?? 0;
                  const txOver = txUsed > d.txCap;
                  const rxOver = rxUsed > d.rxCap;
                  return (
                    <tr key={d.id} className="border-t">
                      <td className="p-2 font-medium">{d.name}</td>
                      <td className={`p-2 ${txOver ? classWarn : classOk}`}>{txUsed} / {d.txCap}</td>
                      <td className={`p-2 ${rxOver ? classWarn : classOk}`}>{rxUsed} / {d.rxCap}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-24 border rounded-lg p-1"
                            value={d.txCap}
                            onChange={(e) => updateDeviceField(d.id, "txCap", e.target.value)}
                          />
                          <input
                            type="number"
                            className="w-24 border rounded-lg p-1"
                            value={d.rxCap}
                            onChange={(e) => updateDeviceField(d.id, "rxCap", e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <button className="text-red-600" onClick={() => removeDevice(d.id)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <p><span className="font-semibold">Color cue:</span> <span className={classOk}>OK</span> vs <span className={classWarn}>Over capacity</span></p>
          </div>
        </div>
      </section>

      {/* Connections Section */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 p-4 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Add Connection</h2>
          <div className="space-y-3">
            <label className="block text-sm">Transmitter</label>
            <select
              className="w-full border rounded-xl p-2"
              value={newConn.txId || ""}
              onChange={(e) => setNewConn({ ...newConn, txId: e.target.value })}
            >
              <option value="">Select…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <label className="block text-sm">Receivers (multi‑select)</label>
            <div className="max-h-40 overflow-auto border rounded-xl p-2 space-y-1">
              {devices.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newConn.rxIds?.includes(d.id) || false}
                    onChange={(e) => {
                      const set = new Set(newConn.rxIds || []);
                      if (e.target.checked) set.add(d.id); else set.delete(d.id);
                      setNewConn({ ...newConn, rxIds: Array.from(set) });
                    }}
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Channels</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-xl p-2"
                  value={newConn.channels as number}
                  onChange={(e) => setNewConn({ ...newConn, channels: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm">Mode</label>
                <select
                  className="w-full border rounded-xl p-2"
                  value={newConn.mode}
                  onChange={(e) => setNewConn({ ...newConn, mode: e.target.value as any })}
                >
                  <option value="unicast">Unicast</option>
                  <option value="multicast">Multicast</option>
                </select>
              </div>
            </div>

            {newConn.mode === "multicast" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Multicast Flow Size</label>
                  <select
                    className="w-full border rounded-xl p-2"
                    value={newConn.multicastSize as number}
                    onChange={(e) => setNewConn({ ...newConn, multicastSize: Number(e.target.value) as any })}
                  >
                    {[8,16,32,64].map((n) => (
                      <option key={n} value={n}>{n} ch</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <label className="block text-sm">Note (optional)</label>
            <input
              className="w-full border rounded-xl p-2"
              placeholder="e.g., IEM feeds / Stage Left"
              value={newConn.note || ""}
              onChange={(e) => setNewConn({ ...newConn, note: e.target.value })}
            />

            <button onClick={addConnection} className="w-full rounded-xl bg-black text-white py-2">Add Connection</button>
          </div>
        </div>

        <div className="md:col-span-2 p-4 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Connections</h2>
          {connections.length === 0 ? (
            <p className="text-sm text-gray-500">No connections yet. Add one on the left.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="p-2">Mode</th>
                    <th className="p-2">Transmitter</th>
                    <th className="p-2">Receivers</th>
                    <th className="p-2">Channels</th>
                    <th className="p-2">Details</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => {
                    const tx = devices.find((d) => d.id === c.txId);
                    const rxs = devices.filter((d) => c.rxIds?.includes(d.id));
                    return (
                      <tr key={c.id} className="border-t align-top">
                        <td className="p-2">{c.mode}</td>
                        <td className="p-2 font-medium">{tx?.name}</td>
                        <td className="p-2">{rxs.map((r) => r.name).join(", ")}</td>
                        <td className="p-2">{c.channels}</td>
                        <td className="p-2 text-xs text-gray-600">
                          {c.mode === "unicast" ? (
                            <span>{`Uses ${ceilDiv(Math.max(1, c.channels), 4)} flow(s) per receiver (Tx & Rx).`}</span>
                          ) : (
                            <span>{`Uses 1 Tx multicast flow; each receiver uses 1 Rx flow. Size ${c.multicastSize}ch.`}</span>
                          )}
                          {c.note ? <div className="mt-1 italic">{c.note}</div> : null}
                        </td>
                        <td className="p-2"><button className="text-red-600" onClick={() => removeConnection(c.id)}>Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Summary Section */}
      <section className="p-4 bg-white border rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-gray-50 border">
            <div className="text-gray-600">Total Tx Flows (all devices)</div>
            <div className="text-xl font-bold">{totals.totalTx}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border">
            <div className="text-gray-600">Total Rx Flows (all devices)</div>
            <div className="text-xl font-bold">{totals.totalRx}</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border">
            <div className="text-gray-600">Unicast pack size</div>
            <div className="text-xl font-bold">4 channels</div>
          </div>
        </div>
        <ul className="mt-4 text-sm list-disc ml-5 text-gray-700">
          <li>Unicast: flows scale per receiver: <span className="font-mono">ceil(ch/4)</span> on the transmitter and the receiver.</li>
          <li>Multicast: one transmit flow regardless of audience size; each subscribing receiver consumes one receive flow.</li>
          <li>Adjust device flow caps to match specific Dante models to check headroom/overruns.</li>
        </ul>
      </section>

      <footer className="text-xs text-gray-500 pt-2">
        Tip: Model IEM or monitor buses as unicast (low fan‑out), and system‑wide feeds (PA, program, comms) as multicast to reduce Tx flow load.
      </footer>
    </div>
  );
}
