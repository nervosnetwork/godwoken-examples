const { RPC, Reader } = require("ckb-js-toolkit");
const { utils } = require("@ckb-lumos/base");

function buildAccountKey(id, key) {
    const right = Buffer.from(key.slice(2), "hex");
    const buf = Buffer.alloc(64);
    buf.writeUInt32LE(id);
    right.copy(buf, 32);
    return utils.ckbHash(buf);
}

function toBigUInt64LE(num) {
    num = BigInt(num);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(num);
    return `0x${buf.toString("hex")}`;
}

class Godwoken {
    constructor(url) {
        this.rpc = new RPC(url);
    }

    async _send(l2tx, method) {
        const data = new Reader(core.SerializeL2Transaction(l2tx)).serializeJson();
        return await method(data);
    }

    async execute(l2tx) {
        return this._send(l2tx, this.rpc.execute);
    }
    async submitL2Transaction(l2tx) {
        return this._send(l2tx, this.rpc.submitL2Transaction);
    }
    async lastSynced() {
        const data = await this.rpc.lastSynced();
        return core.HeaderInfo(new Reader(data));
    }
    async getStorageAt(raw_key) {
        return await this.rpc.getStorageAt(raw_key);
    }
    async tip() {
        return await this.rpc.tip();
    }
    async status() {
        return await this.rpc.tip();
    }

    async createAccount(script) {
        const create_account = { script };
    }
    async getSudtBalance(sudt_id, account_id) {
        const buf = Buffer.alloc(32);
        buf.writeUInt32LE(account_id);
        const key = `0x${buf.toString("hex")}`;
        const raw_key = buildAccountKey(sudt_id, key);
        const value = await self.getStorageAt(raw_key);
        return utils.readBigUInt128LE(value);
    }
}
