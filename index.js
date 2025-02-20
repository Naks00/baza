const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const path = require('path');

const Senzori = new sqlite3.Database('./Senzori.db', (err) => {
    if (err) {
        console.error('Greška prilikom povezivanja s bazom:', err);
    } else {
        console.log('Povezano na SQLite bazu Senzori');
    }
});

const Ocitanja = new sqlite3.Database('./Ocitanja.db', (err) => {
    if (err) {
        console.error('Greška prilikom povezivanja s bazom:', err);
    } else {
        console.log('Povezano na SQLite bazu Ocitanja');
    }
});

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const decoder = new StringDecoder('utf-8');
    let body = '';

    req.on('data', (chunk) => {
        body += decoder.write(chunk);
    });

    req.on('end', () => {
        body += decoder.end();

        // Serve static files
        if (req.method === 'GET' && (parsedUrl.pathname.startsWith('/style.css') || parsedUrl.pathname.startsWith('/script.js'))) { 
            const filePath = path.join(__dirname, 'public', parsedUrl.pathname); 

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.statusCode = 404;
                    res.end('Not Found');
                    return;
                }
                let contentType = 'text/plain'; // Default
                if (parsedUrl.pathname.endsWith('.css')) {
                    contentType = 'text/css';
                } else if (parsedUrl.pathname.endsWith('.js')) {
                    contentType = 'text/javascript';
                }
                res.setHeader('Content-Type', contentType);
                res.statusCode = 200;
                res.end(data);
            });
        }
        else if (parsedUrl.pathname === '/') {
            const loginPagePath = path.join(__dirname, 'public', 'index.html'); 
            fs.readFile(loginPagePath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.end('Greška pri učitavanju login stranice');
                    return;
                }
                res.setHeader('Content-Type', 'text/html');
                res.statusCode = 200;
                res.end(data);
            });
        } else if (parsedUrl.pathname === '/api/Senzori') {
            if (req.method === 'GET') {
                Senzori.all('SELECT * FROM Senzori', (err, rows) => {
                    if (err) {
                        console.error('Greška pri dohvaćanju korisnika:', err);
                        res.statusCode = 500;
                        res.end('Greška na serveru');
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify(rows));
                });
            } else if (req.method === 'POST') {
                const { naziv, tip, lokacija } = JSON.parse(body);
                if (!naziv || !tip || !lokacija) {
                    res.statusCode = 400;
                    res.end('Svi podaci moraju biti prisutni');
                    return;
                }
                const query = 'INSERT INTO Senzori (naziv, tip, lokacija) VALUES (?, ?, ?)';
                Senzori.run(query, [naziv, tip, lokacija], function (err) {
                    if (err) {
                        console.error('Greška pri dodavanju senzora:', err);
                        res.statusCode = 500;
                        res.end('Greška na serveru');
                        return;
                    }
                    res.statusCode = 201;
                    res.end(`Senzor dodan s ID-om ${this.lastID}`);
                });
            } else if (req.method === 'PUT') {
                try {
                    const { id, naziv, tip, lokacija } = JSON.parse(body);
                    if (!id || !naziv || !tip || !lokacija) {
                        res.statusCode = 400;
                        res.end('Svi podaci moraju biti prisutni');
                        return;
                    }
                    const query = 'UPDATE Senzori SET naziv = ?, tip = ?, lokacija = ? WHERE id = ?';
                    Senzori.run(query, [naziv, tip, lokacija, id], function (err) {
                        if (err) {
                            console.error('Greška pri ažuriranju senzora:', err);
                            res.statusCode = 500;
                            res.end('Greška na serveru');
                            return;
                        }
                        if (this.changes === 0) {
                            res.statusCode = 404;
                            res.end('Senzor nije pronađen');
                            return;
                        }
                        res.statusCode = 200;
                        res.end('Senzor ažuriran');
                    });
                } catch (error) {
                    console.error('Greška u tijelu zahtjeva:', error);
                    res.statusCode = 400;
                    res.end('Neispravan JSON format');
                }
            } else if (req.method === 'DELETE') {
                const { id } = JSON.parse(body);
                const query = 'DELETE FROM Senzori WHERE id = ?';
                Senzori.run(query, [id], function (err) {
                    if (err) {
                        console.error('Greška pri brisanju senzora:', err);
                        res.statusCode = 500;
                        res.end('Greška na serveru');
                        return;
                    }
                    if (this.changes === 0) {
                        res.statusCode = 404;
                        res.end('Senzor nije pronađen');
                        return;
                    }
                    res.statusCode = 200;
                    res.end('Senzor uspješno obrisan');
                });
            }
        } else if (parsedUrl.pathname === '/api/Ocitanja') {
            if (req.method === 'GET') {
                Ocitanja.all('SELECT * FROM Ocitanja', (err, rows) => {
                    if (err) {
                        console.error('Greška pri dohvaćanju očitanja:', err);
                        res.statusCode = 500;
                        res.end('Greška na serveru');
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify(rows));
                });
            } else {
              // Method Not Allowed
                res.statusCode = 405;
                res.end('Method Not Allowed');
            }
        } else {
            res.statusCode = 404;
            res.end('Stranica nije pronađena');
        }
    });
});

server.listen(8080, () => {
    console.log('Server je pokrenut na http://localhost:8080');
});
