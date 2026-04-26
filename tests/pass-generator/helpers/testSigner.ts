import forge from "node-forge";

/**
 * Generate a throwaway RSA keypair + self-signed "Apple-like" cert chain:
 * a root CA (stand-in for WWDR) and a leaf signer cert (stand-in for the
 * Pass Type ID signing cert). Used across tests so we never need the real
 * Apple keys to verify round-trip signing.
 */
export function makeTestSignerContext() {
  const rootKeys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const rootCert = forge.pki.createCertificate();
  rootCert.serialNumber = "01";
  rootCert.validity.notBefore = new Date();
  rootCert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  rootCert.publicKey = rootKeys.publicKey;
  const rootSubject = [
    { name: "commonName", value: "Test WWDR" },
    { name: "organizationName", value: "Test" },
  ];
  rootCert.setSubject(rootSubject);
  rootCert.setIssuer(rootSubject);
  rootCert.setExtensions([{ name: "basicConstraints", cA: true }]);
  rootCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  const leafKeys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const leafCert = forge.pki.createCertificate();
  leafCert.serialNumber = "02";
  leafCert.validity.notBefore = new Date();
  leafCert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  leafCert.publicKey = leafKeys.publicKey;
  leafCert.setSubject([
    { name: "commonName", value: "Pass Type ID: test" },
    { name: "organizationName", value: "Test" },
  ]);
  leafCert.setIssuer(rootSubject);
  leafCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  return {
    signerCertPem: forge.pki.certificateToPem(leafCert),
    wwdrCertPem: forge.pki.certificateToPem(rootCert),
    privateKeyPem: forge.pki.privateKeyToPem(leafKeys.privateKey),
    rootCert,
    leafCert,
  };
}
