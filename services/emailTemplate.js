function receiverMailTemplate (senderName, receiverName, amount) {
    return `
        <h2>Hi ${receiverName},</h2>
        <p>${senderName} has sent ${amount} to your wallet.</p>
    `;
}

function senderMailTemplate (senderName, receiverName, amount) {
    return `
        <h2>Hi ${senderName},</h2>
        <p>You just sent ${amount} to ${receiverName}.</p>
    `;
}

module.exports = {
    receiverMailTemplate,
    senderMailTemplate
}