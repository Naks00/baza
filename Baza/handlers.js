const sqlite = require("node:sqlite");

let handlers = new Map();

const THRESHOLDS = {
    distance1: 200, // Threshold for the first distance sensor
    distance2: 200, // Threshold for the second distance sensor
    tilt: 30,       // Threshold for tilt sensor
    motion: 1       // Threshold for PIR sensor (1 = motion detected)
};

// List, add, modify or delete devices
function _Devices(req, res, q, data) {
    const sp = q.searchParams;
    const id = sp.get("id");

    if (req.method == 'GET') {
        try {
            const db = new sqlite.DatabaseSync("./sensor_data.db", { open: false });
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
    const mac_address = sp.get("mac_address");
    const distance1 = parseFloat(sp.get("distance1"));
    const distance2 = parseFloat(sp.get("distance2"));
    const tilt = parseFloat(sp.get("tilt"));
    const motion = parseInt(sp.get("motion"));

    if (req.method === 'POST') {
        try {
            const db = new sqlite.DatabaseSync("./sensor_data.db", { open: false });
            db.open();

            const deviceSql = "SELECT id FROM Devices WHERE mac_address = :mac_address";
            const deviceStmt = db.prepare(deviceSql);
            const device = deviceStmt.get({ mac_address });

            if (!device) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.write(JSON.stringify({ message: `No device with mac_address=${mac_address} found.` }));
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
                distance1,
                distance2,
                tilt,
                motion
            });

            const updateDeviceSql = "UPDATE Devices SET last_active = CURRENT_TIMESTAMP WHERE id = :device_id";
            db.prepare(updateDeviceSql).run({ device_id: device.id });

            const alertSql = `
                INSERT INTO Alerts (device_id, alert_type, created_at)
                VALUES (:device_id, :alert_type, CURRENT_TIMESTAMP)
            `;
            const alertStmt = db.prepare(alertSql);

            let alertMessage = '';

            if (distance1 > THRESHOLDS.distance1) {
                alertStmt.run({ device_id: device.id, alert_type: 'High distance1' });
                alertMessage += 'Alert: High distance1. ';
            }
            if (distance2 > THRESHOLDS.distance2) {
                alertStmt.run({ device_id: device.id, alert_type: 'High distance2' });
                alertMessage += 'Alert: High distance2. ';
            }
            if (tilt > THRESHOLDS.tilt) {
                alertStmt.run({ device_id: device.id, alert_type: 'High tilt' });
                alertMessage += 'Alert: High tilt. ';
            }
            if (motion == THRESHOLDS.motion) {
                alertStmt.run({ device_id: device.id, alert_type: 'Motion detected by PIR' });
                alertMessage += 'Alert: Motion detected by PIR. ';
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.write(JSON.stringify({ message: `Sensor data stored successfully. ${alertMessage}` }));
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
            const db = new sqlite.DatabaseSync("./sensor_data.db", { open: false });
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
