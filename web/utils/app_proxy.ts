import querystring from "querystring";
import crypto from "crypto";

export const verifySignature = function ({
	url,
	secret,
}: {
	url: string;	
	secret: string;
}): boolean {
  // urlの?以降をquerystringに読み込ませる
	const qs = url.match(/\?(.*)/);
	const query = querystring.parse((qs && qs[1]) || "");

  // 計算結果のsignatureを除いたqueryparamで計算して，比較する
	const signature = query.signature || "";
	delete query.signature;
	const input = Object.keys(query)
    .sort()
    .map((key) => {
		const v = query[key];
		const value = Array.isArray(v) ? v : [v];
		return `${key}=${value.join(",")}`;
    })
    .join("");
	const hash = crypto.createHmac("sha256", secret).update(input).digest("hex");

	if (signature !== hash) {
    throw new Error("正しくないリクエストが送信されました");
	}
	return true;
};