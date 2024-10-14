import { useEffect, useState } from 'react';
// import { PrivateKey } from '@steemit/steem-js/lib/auth/ecc';
import QRious from 'qrious';
import jsPDF from 'jspdf';
import RobotoRegular from '../assets/fonts/Roboto-Regular.ttf';
import RobotoBold from '../assets/fonts/Roboto-Bold.ttf';
import RobotoMonoRegular from '../assets/fonts/RobotoMono-Regular.ttf';

// TODO: mock steem-js PrivateKey
const PrivateKey = {
  fromSeed: () => {
    return {
      toString: () => 'test mock of PrivateKey',
      toPublicKey: () => ({
        toString: () => 'test mock of PrivateKey',
      }),
    };
  },
};

function image2canvas(image, bgcolor) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width * 32;
  canvas.height = image.height * 32;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgcolor;
  ctx.fillRect(0.0, 0.0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas;
}

function PdfDownload(props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const { dlPdf, resetDlPdf } = props;
    if (dlPdf === true) {
      try {
        downloadPdf();
      } catch (e) {
        console.error(e);
        resetDlPdf();
      }
      resetDlPdf();
    }
  }, [props.dlPdf]);

  function generateKeys(name, password) {
    return ['active', 'owner', 'posting', 'memo'].reduce(
      (accum, kind) => {
        const rawKey = PrivateKey.fromSeed(`${name}${kind}${password}`);
        accum[`${kind}Private`] = rawKey.toString();
        accum[`${kind}Public`] = rawKey.toPublicKey().toString();
        return accum;
      },
      { master: password }
    );
  }

  function downloadPdf() {
    const keys = generateKeys(props.name, props.password);
    const filename = `Keys for @${props.name}.pdf`;
    renderPdf(keys, filename).save(filename);
  }

  function drawFilledRect(ctx, x, y, w, h, { color }) {
    ctx.setDrawColor(0);
    ctx.setFillColor(color);
    ctx.rect(x, y, w, h, 'F');
  }

  function drawStrokedRect(ctx, x, y, w, h, { color, lineWidth }) {
    ctx.setLineWidth(lineWidth);
    ctx.setDrawColor(color);
    ctx.rect(x, y, w, h);
  }

  function drawImageFromCanvas(ctx, selector, x, y, w, h, bgcolor) {
    const canvas = image2canvas(document.querySelector(selector), bgcolor); // svg -> jpg
    ctx.addImage(canvas, 'JPEG', x, y, w, h);
  }

  function drawQr(ctx, data, x, y, size, bgcolor) {
    const canvas = document.createElement('canvas');
    const qr = new QRious({
      element: canvas,
      size: 250,
      value: data,
      background: bgcolor,
    });
    ctx.addImage(canvas, 'PNG', x, y, size, size);
  }

  function addPage(ctx) {
    ctx.addPage('letter', 'portrait');
  }

  function renderText(
    ctx,
    text,
    { scale, x, y, lineHeight, maxWidth, color, fontSize, font }
  ) {
    const textLines = ctx
      .setFont(font)
      .setFontSize(fontSize * scale)
      .setTextColor(color)
      .splitTextToSize(text, maxWidth);
    ctx.text(textLines, x, y + fontSize);
    return textLines.length * fontSize * lineHeight;
  }

  function renderPdf(keys, filename) {
    const widthInches = props.widthInches; // 8.5,
    const lineHeight = 1.2;
    const margin = 0.3;
    const maxLineWidth = widthInches - margin * 2.0;
    const fontSize = 24;
    const scale = 72; // ptsPerInch
    const oneLineHeight = (fontSize * lineHeight) / scale;
    const qrSize = 1.1;

    const ctx = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      lineHeight,
      format: 'letter',
    }).setProperties({ title: filename });

    ctx.addFont(RobotoRegular, 'Roboto-Regular', 'normal');
    ctx.addFont(RobotoBold, 'Roboto-Bold', 'normal');
    ctx.addFont(RobotoMonoRegular, 'RobotoMono-Regular', 'normal');

    let offset = 0.0,
      sectionStart = 0,
      sectionHeight = 0;

    // HEADER

    sectionHeight = 1.29;
    drawFilledRect(ctx, 0.0, 0.0, widthInches, sectionHeight, {
      color: '#1f0fd1',
    });

    drawImageFromCanvas(
      ctx,
      '.pdf-logo',
      widthInches - margin - 1.9,
      0.36,
      0.98 * 1.8,
      0.3 * 1.8,
      '#1F0FD1'
    );

    offset += 0.265;
    offset += renderText(ctx, `Keys for @${props.name}`, {
      scale,
      x: margin,
      y: offset,
      lineHeight: 1.0,
      maxWidth: maxLineWidth,
      color: 'white',
      fontSize: 0.36,
      font: 'Roboto-Bold',
    });

    /*
        offset += 0.1;
        offset += renderText(
            ctx,
            'Your recovery account partner: Steemitwallet.com',
            {
                scale,
                x: margin,
                y: offset,
                lineHeight: 1.0,
                maxWidth: maxLineWidth,
                color: 'white',
                fontSize: 0.18,
                font: 'Roboto-Bold',
            }
        );
        */

    offset += 0.15;
    offset += renderText(
      ctx,
      `Generated at ${new Date()
        .toISOString()
        .replace(/\.\d{3}/, '')} by steemit.com`,
      {
        scale,
        x: margin,
        y: offset,
        lineHeight: 1.0,
        maxWidth: maxLineWidth,
        color: 'white',
        fontSize: 0.14,
        font: 'Roboto-Bold',
      }
    );

    offset = sectionStart + sectionHeight;

    // BODY
    /*
        offset += 0.2;
        offset += renderText(
            ctx,
            'Steemit.com is powered by Steem and uses its hierarchical key ' +
                'system to keep you and your tokens safe. Print this out and ' +
                'keep it somewhere safe. When in doubt, use your Private ' +
                'Posting Key as your password, not your Master Password which ' +
                'is only intended to be used to change your private keys. You ' +
                'can also view these anytime at: https://steemdb.io/' +
                props.name,
            {
                scale,
                x: margin,
                y: offset,
                lineHeight: lineHeight,
                maxWidth: maxLineWidth,
                color: 'black',
                fontSize: 0.14,
                font: 'Roboto-Regular',
            }
        );
*/
    // PRIVATE KEYS INTRO

    offset += 0.1;
    offset += renderText(
      ctx,
      'Instead of password based authentication, blockchain accounts ' +
        'have a set of public and private key pairs that are used for ' +
        'authentication as well as the encryption and decryption of ' +
        'data. Do not share this file with anyone.',
      {
        scale,
        x: margin,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth,
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );
    // offset += 0.2;

    // tron account information
    offset += 0.2;
    offset += renderText(ctx, 'Your Tron account', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.18,
      font: 'Roboto-Bold',
    });
    offset += 0.1;
    // tron account public key
    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;
    drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {
      color: 'f4f4f4',
    });

    offset += 0.15;
    drawQr(ctx, props.tron_address, margin, offset, qrSize, '#f4f4f4');

    offset += 0.1;
    offset += renderText(ctx, 'TRON Public Key (TRON Address)', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.2,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'Used for transfers. The public key is the address you send the tokens to',
      {
        scale,
        x: margin + qrSize + 0.1,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth - (qrSize + 0.1),
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075; // todo: replace tron address
    offset += renderText(ctx, props.tron_address, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.6,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });
    offset += 0.2;
    offset = sectionStart + sectionHeight;

    // tron account private key
    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;

    offset += 0.15;
    drawQr(ctx, props.tron_key, margin, offset, qrSize, '#f4f4f4');

    offset += 0.1;
    offset += renderText(ctx, 'TRON Private Key', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.2,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'This private key has the highest authority on your TRON account. It is ' +
        'used for signing transactions of TRON, such as transferring tokens,freezing and voting',
      {
        scale,
        x: margin + qrSize + 0.1,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth - (qrSize + 0.1),
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075; // todo: replace tron private key
    offset += renderText(ctx, props.tron_key, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.5,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });
    offset += 0.2;
    offset = sectionStart + sectionHeight;

    // Steemit Account
    offset += 0.4;
    offset += renderText(ctx, 'Your Steemit Private Keys', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.18,
      font: 'Roboto-Bold',
    });
    offset += 0.1;
    // POSTING KEY

    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;
    drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {
      color: 'f4f4f4',
    });

    offset += 0.15;
    drawQr(
      ctx,
      `steem://import/wif/${keys.postingPrivate}/account/${props.name}`,
      margin,
      offset,
      qrSize,
      '#f4f4f4'
    );

    offset += 0.1;
    offset += renderText(ctx, 'Private Posting Key', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'Used to log in to apps such as Steemit.com and perform social ' +
        'actions such as posting, commenting, and voting.',
      {
        scale,
        x: margin + qrSize + 0.1,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth - (qrSize + 0.1),
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075;
    offset += renderText(ctx, keys.postingPrivate, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.6,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });
    offset += 0.2;
    offset = sectionStart + sectionHeight;

    // MEMO KEY

    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;
    // drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {color: '#f4f4f4'});

    offset += 0.15;
    drawQr(
      ctx,
      `steem://import/wif/${keys.memoPrivate}/account/${props.name}`,
      margin,
      offset,
      qrSize,
      '#ffffff'
    );

    offset += 0.1;

    offset += renderText(ctx, 'Private Memo Key', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(ctx, 'Used to decrypt private transfer memos.', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth - (qrSize + 0.1),
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Regular',
    });

    offset += 0.075;
    offset += renderText(ctx, keys.memoPrivate, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.6,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    offset += 0.1;
    offset = sectionStart + sectionHeight;

    // ACTIVE KEY

    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;
    drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {
      color: '#f4f4f4',
    });

    offset += 0.15;
    drawQr(
      ctx,
      `steem://import/wif/${keys.activePrivate}/account/${props.name}`,
      margin,
      offset,
      qrSize,
      '#f4f4f4'
    );

    offset += 0.1;

    offset += renderText(ctx, 'Private Active Key', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'Used for monetary and wallet related actions, such as ' +
        'transferring tokens or powering STEEM up and down.',
      {
        scale,
        x: margin + qrSize + 0.1,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth - (qrSize + 0.1),
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075;
    offset += renderText(ctx, keys.activePrivate, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.6,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });
    // offset += 0.2;

    // offset = sectionStart + sectionHeight;
    // add a new page
    ctx.addPage('letter', 'portrait');
    offset = 0.2;

    // OWNER KEY
    sectionStart = offset;
    sectionHeight = qrSize + 0.15 * 2;
    // drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {color: '#f4f4f4'});

    offset += 0.15;
    drawQr(
      ctx,
      `steem://import/wif/${keys.ownerPrivate}/account/${props.name}`,
      margin,
      offset,
      qrSize,
      '#ffffff'
    );

    offset += 0.1;

    offset += renderText(ctx, 'Private Owner Key', {
      scale,
      x: margin + qrSize + 0.1,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth - qrSize - 0.1,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'This key is used to reset all your other keys. It is ' +
        'recommended to keep it offline at all times. If your ' +
        'account is compromised, use this key to recover it ' +
        'within 30 days at https://steemitwallet.com.',
      {
        scale,
        x: margin + qrSize + 0.1,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth - (qrSize + 0.1),
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075;
    offset += renderText(ctx, keys.ownerPrivate, {
      scale,
      x: margin + qrSize + 0.1,
      y: sectionStart + sectionHeight - 0.6,
      lineHeight,
      maxWidth: maxLineWidth - qrSize - 0.1,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    offset = sectionStart + sectionHeight;

    // MASTER PASSWORD

    sectionHeight = 1;
    sectionStart = offset;
    drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {
      color: '#f4f4f4',
    });

    offset += 0.2;
    offset += renderText(ctx, ['Master Password'].join(''), {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(
      ctx,
      'The seed password used to generate this document. ' +
        'Do not share this key.',
      {
        scale,
        x: margin,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth,
        color: 'black',
        fontSize: 0.14,
        font: 'Roboto-Regular',
      }
    );

    offset += 0.075;
    offset += renderText(ctx, keys.master, {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    offset = sectionStart + sectionHeight;

    // PUBLIC KEYS INTRO

    sectionStart = offset;
    sectionHeight = 1.0;
    // drawFilledRect(ctx, 0.0, offset, widthInches, sectionHeight, {color: '#f4f4f4'});

    offset += 0.1;
    offset += renderText(ctx, 'Your Steemit Public Keys', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.18,
      font: 'Roboto-Bold',
    });

    offset += 0.1;
    offset += renderText(
      ctx,
      `${
        'Public keys are associated with usernames and are used to ' +
        'encrypt and verify messages. Your public keys are not required ' +
        'for login. You can view these anytime at: https://steemscan.com/account/'
      }${props.name}`,
      {
        scale,
        x: margin,
        y: offset,
        lineHeight,
        maxWidth: maxLineWidth,
        color: 'black',
        fontSize: 0.15,
        font: 'Roboto-Regular',
      }
    );

    offset = sectionStart + sectionHeight;

    // PUBLIC KEYS

    renderText(ctx, 'Posting Public', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(ctx, keys.postingPublic, {
      scale,
      x: 1.25,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    renderText(ctx, 'Memo Public', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(ctx, keys.memoPublic, {
      scale,
      x: 1.25,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    renderText(ctx, 'Active Public', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(ctx, keys.activePublic, {
      scale,
      x: 1.25,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    renderText(ctx, 'Owner Public', {
      scale,
      x: margin,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'Roboto-Bold',
    });

    offset += renderText(ctx, keys.ownerPublic, {
      scale,
      x: 1.25,
      y: offset,
      lineHeight,
      maxWidth: maxLineWidth,
      color: 'black',
      fontSize: 0.14,
      font: 'RobotoMono-Regular',
    });

    renderText(ctx, 'v0.1', {
      scale,
      x: maxLineWidth - 0.2,
      y: offset - 0.2,
      lineHeight,
      maxWidth: maxLineWidth,
      color: '#bbbbbb',
      fontSize: 0.14,
      font: 'Roboto-Regular',
    });

    return ctx;
  }

  return (
    <div className="pdf-download" style={{ visibility: 'hidden' }}>
      <img
        alt=""
        src="/img/pdf-logo.svg"
        style={{ display: 'none' }}
        className="pdf-logo"
      />
    </div>
  );
}

export default PdfDownload;
