const sqlite = require("node:sqlite");

let handlers = new Map();

const THRESHOLDS = {
    distance1: 200, // Threshold for the first distance sensor
    distance2: 200, // Threshold for the second distance sensor
    tilt: 30,       // Threshold for tilt sensor
    motion: 1       // Threshold for PIR sensor (1 = motion detected)
};


function _Devices(req, res, q, data) {
    const sp = q.searchParams;
    const id = sp.get("id");

    if (req.method == 'GET') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            if (id == undefined) {
                const sql = "SELECT * FROM Devices";
                const stmt = db.prepare(sql);
                const result = stmt.all();

                res.writeHead(200, { "Content-Type": "application/json" });
                res.write(JSON.stringify(result));
            } else {
                const sql = "SELECT * FROM Devices WHERE id=:id";
                const stmt = db.prepare(sql);
                const result = stmt.get({ id });

                if (!result) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.write(JSON.stringify({ message: `No device with id=${id} was found.` }));
                    res.end();
                    db.close();
                    return true;
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                res.write(JSON.stringify(result));
            }

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else if (req.method === 'PUT') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            if (!id) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: "Missing device id." }));
                res.end();
                db.close();
                return true;
            }

            const params = JSON.parse(data);
            const sqlCheck = "SELECT * FROM Devices WHERE id = :id";
            const device = db.prepare(sqlCheck).get({ id });

            if (!device) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: `No device with id=${id} was found.` }));
                res.end();
                db.close();
                return true;
            }

            const sqlUpdate = `
                UPDATE Devices 
                SET mac_address = :mac_address, device_name = :device_name, location = :location 
                WHERE id = :id
            `;
            db.prepare(sqlUpdate).run({
                id,
                mac_address: params.mac_address,
                device_name: params.device_name,
                location: params.location
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: `Device with id=${id} updated successfully.` }));

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else if (req.method === 'DELETE') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            if (!id) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: "Missing device id." }));
                res.end();
                db.close();
                return true;
            }

            const sqlCheck = "SELECT * FROM Devices WHERE id = :id";
            const device = db.prepare(sqlCheck).get({ id });

            if (!device) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: `No device with id=${id} was found.` }));
                res.end();
                db.close();
                return true;
            }

            const sqlDelete = "DELETE FROM Devices WHERE id = :id";
            db.prepare(sqlDelete).run({ id });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: `Device with id=${id} deleted successfully.` }));

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Method not allowed" }));
        res.end();
        return true;
    }
}

// List or add sensor readings
function _SensorReadings(req, res, q, data) {
    const sp = q.searchParams;

    if (req.method === 'GET') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            const sql = "SELECT * FROM SensorReadings ORDER BY device_id";
            const stmt = db.prepare(sql);
            const result = stmt.all();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify(result));

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else if (req.method === 'POST') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            const deviceSql = "SELECT id FROM Devices WHERE mac_address = :mac_address";
            const deviceStmt = db.prepare(deviceSql);
            const device = deviceStmt.get({ mac_address: sp.get("mac_address") });

            if (!device) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: `No device with mac_address=${sp.get("mac_address")} found.` }));
                res.end();
                db.close();
                return true;
            }

            const insertSql = `
                INSERT INTO SensorReadings (device_id, distance1, distance2, tilt, motion)
                VALUES (:device_id, :distance1, :distance2, :tilt, :motion)
            `;
            db.prepare(insertSql).run({
                device_id: device.id,
                distance1: parseFloat(sp.get("distance1")),
                distance2: parseFloat(sp.get("distance2")),
                tilt: parseFloat(sp.get("tilt")),
                motion: parseInt(sp.get("motion"))
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Sensor data stored successfully." }));

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Method not allowed" }));
        res.end();
        return true;
    }
}


function _Alerts(req, res, q, data) {
    const sp = q.searchParams;

    if (req.method == 'GET') {
        try {
            const db = new sqlite.DatabaseSync("C:/Users/anten/Desktop/Baza/SQLite/sensor_data.db", { open: false });
            db.open();

            const sql = "SELECT * FROM Alerts";
            const stmt = db.prepare(sql);
            const result = stmt.all();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify(result));

            db.close();
            res.end();
            return true;
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: "Internal Server Error: " + error.message }));
            res.end();
            return true;
        }
    } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ message: "Method not allowed" }));
        res.end();
        return true;
    }
}

handlers.set("/devices", _Devices);
handlers.set("/sensor-readings", _SensorReadings);
handlers.set("/alerts", _Alerts);

module.exports = handlers;
