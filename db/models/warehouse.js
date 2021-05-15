const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const warehouseSchema = new Schema({
    details: {
        type: Schema.Types.Mixed
    },
    data: {
        type: Schema.Types.Mixed
    },
    timestamp: {
        type: String,
        default: new Date()
    }
 });


module.exports = warehouseSchema;
