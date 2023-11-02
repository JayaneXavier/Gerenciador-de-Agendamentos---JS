const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const porta = 3000;

const db = new sqlite3.Database('./banco.db');

db.run(`
    CREATE TABLE IF NOT EXISTS Agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataHora DATETIME NOT NULL,
    paciente TEXT NOT NULL,
    medico TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('marcado', 'cancelado', 'concluido'))
);
`);

app.use(express.json());
app.use(cors());

app.listen(porta, () => {
    console.log(`Servidor rodando na porta: ${porta}`);
});

app.post('/agendamentos', (req, res) => {
    const { datahora, paciente, medico, status } = req.body;

    const atual = new Date();
    const agendamento = new Date(datahora);

    if (agendamento < atual) {
        return res.status(400).json({ error: 'Data inválida.' });
    }

    db.all('SELECT * FROM Agendamentos WHERE datahora=? AND medico=? AND status=?',
        [datahora, medico, 'marcado'],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (rows.length === 0) {
                const sql = 'INSERT INTO Agendamentos (datahora, paciente, medico, status) VALUES (?, ?, ?, ?)';

                db.run(sql, [datahora, paciente, medico, status], function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'Agendamento criado.', id: this.lastID });
                });
            } else {
                res.status(409).json({ message: 'Já existe um agendamento para este médico no horário.' });
            }
        });
});

app.get('/agendamentos', (req, res) => {
    const sql = 'SELECT * FROM Agendamentos';

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ agendamentos: rows });
    });
});

app.put('/agendamentos/:id', (req, res) => {
    const id = req.params.id;
    const { dataHora } = req.body;

    if (dataHora) {
        const sql = 'UPDATE Agendamentos SET dataHora = ? WHERE id = ?';
        db.run(sql, [dataHora, id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Não existe.' });
            }
            res.json({ message: 'Data e hora do agendamento atualizadas.' });
        });
    } else {
        const sql = 'UPDATE Agendamentos SET status = ? WHERE id = ?';
        db.run(sql, ['cancelado', id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Não existe.' });
            }
            res.json({ message: 'Agendamento cancelado.' });
        });
    }
});
