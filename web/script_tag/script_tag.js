// 日本語が入っているかを確認
function notIncludeJa(text) {
	try {
		let gmi = 'gmi';
		let regeIncludeHiragana = '^(?=.*[\u3041-\u3096]).*$';
		let regeIncludeKatakana = '^(?=.*[\u30A1-\u30FA]).*$';
		let regeIncludeKanji = '^(?=.*[\u4E00-\u9FFF]).*$';
		let regeHiragana = new RegExp(regeIncludeHiragana, gmi);
		let regeKatakana = new RegExp(regeIncludeKatakana, gmi);
		let regeKanji = new RegExp(regeIncludeKanji, gmi);

		let notIncludeJa = true;
		if (regeHiragana.test(text)){
		notIncludeJa = false;
		}
		if (regeKatakana.test(text)){
		notIncludeJa = false;
		}
		if (regeKanji.test(text)){
		notIncludeJa = false;
		}

		return notIncludeJa;
	} catch (error) {
		alert(error);
	}
}

//Polarisを使うためのcssを入手する
var polarisCss=document.createElement("link");
polarisCss.setAttribute("rel","stylesheet");
polarisCss.setAttribute("type","text/css");
polarisCss.setAttribute("href","https://unpkg.com/@shopify/polaris@9.24.0/build/esm/styles.css");
document.getElementsByTagName("head")[0].appendChild(polarisCss);

var sendSearchRequest = new XMLHttpRequest();
var addressInDatabase = "";
sendSearchRequest.addEventListener('load', (event) => {
	addressInDatabase = event.currentTarget.responseText;
	makeDialog(addressInDatabase);
});

sendSearchRequest.addEventListener('error', (event) => {
	addressInDatabase = "ダイアログは表示しない";
	alert("error");
});

const sendToSearchUrl = 'https://luckyvillages-sample.myshopify.com/apps/address/search_address?' + 'order_id=' + window.Shopify.checkout.order_id;

sendSearchRequest.open('GET',sendToSearchUrl);
sendSearchRequest.send();

function makeDialog(addressInDatabase){
	if(window.Shopify.checkout.billing_address.country_code  == "JP" && notIncludeJa(addressInDatabase)) {
		Shopify.Checkout.OrderStatus.addContentBox(
			`<dialog id="inputDialog" class="Polaris-Card">
				<div class="Polaris-Banner Polaris-Banner--statusInfo Polaris-Banner--hasDismiss Polaris-Banner--withinPage" tabindex="0" role="status" aria-live="polite" aria-labelledby="PolarisBanner1Heading" aria-describedby="PolarisBanner1Content">
					<div class="Polaris-Banner__Ribbon">
					<span class="Polaris-Icon Polaris-Icon--colorHighlight Polaris-Icon--applyColor">
						<span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--regular Polaris-Text--visuallyHidden">
						</span>
						<svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true">
						<path fill-rule="evenodd" d="M10 20c5.514 0 10-4.486 10-10s-4.486-10-10-10-10 4.486-10 10 4.486 10 10 10zm1-6a1 1 0 1 1-2 0v-4a1 1 0 1 1 2 0v4zm-1-9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z">
						</path>
						</svg>
					</span>
					</div>
					<div class="Polaris-Banner__ContentWrapper">
					<div class="Polaris-Banner__Heading" id="PolarisBanner1Heading">
						<p class="Polaris-Text--root Polaris-Text--headingMd Polaris-Text--semibold">住所が英語で入力されています。大変お手数ですが日本語表記で再入力をお願いします。</p>
					</div>
					</div>
				</div>
				
				<div id="englishAddress">
					<div id="englishAddressTableTitle">
						<p style="text-align: center;font-weight: 700;">入力された配送先住所</p>
					</div>
					<div id="englishAddressTable">
						<table style="border-collapse: border-box; border: 1px solid #B3B3B3; border-radius:6px;">
							<tr>
								<td>市区町村</td>
								<td>`+window.Shopify.checkout.shipping_address.city+`</td>
							</tr>
							<tr>
								<td>住所</td>
								<td>`+window.Shopify.checkout.shipping_address.address1+`</td>
							</tr>
							<tr>
								<td>建物名、部屋番号など</td>
								<td>`+(window.Shopify.checkout.shipping_address.address2  || ``)+`</td>
							</tr>					
						</table>
					</div>
				</div>
				<p style="font-weight:700">配送先住所の再入力をお願いします。</p>
				<form id = "inputForm" method="get">
					<input type="hidden" name="order_id" value=` + window.Shopify.checkout.order_id + `>
					<div class="Polaris-FormLayout">
						<div class="Polaris-FormLayout__Item">
							<div class="">
								<div class="Polaris-Labelled__LabelWrapper">
									<div class="Polaris-Label">
										<label id="PolarisTextField1Label" for="PolarisTextField1" class="Polaris-Label__Text">
										<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular">市区町村</span>
										</label>
									</div>
								</div>
								<div class="Polaris-Connected">
									<div class="Polaris-Connected__Item Polaris-Connected__Item--primary">
										<div class="Polaris-TextField">
										<input name="city" id="PolarisTextField1" autocomplete="shipping address-level2" class="Polaris-TextField__Input" type="text" aria-describedby="PolarisTextField1HelpText" aria-labelledby="PolarisTextField1Label" aria-invalid="false" value="">
										<div class="Polaris-TextField__Backdrop">
										</div>
										</div>
									</div>
								</div>
								<div class="Polaris-Labelled__HelpText" id="PolarisTextField1HelpText">
									<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular Polaris-Text--break Polaris-Text--subdued">
										<span style="color: var(--p-text-critical)">市区町村を入力してください</span>
									</span>
								</div>
							</div>
						</div>
						<div class="Polaris-FormLayout__Item">
							<div class="">
								<div class="Polaris-Labelled__LabelWrapper">
									<div class="Polaris-Label">
										<label id="PolarisTextField2Label" for="PolarisTextField2" class="Polaris-Label__Text">
										<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular">住所</span>
										</label>
									</div>
								</div>
								<div class="Polaris-Connected">
									<div class="Polaris-Connected__Item Polaris-Connected__Item--primary">
										<div class="Polaris-TextField">
										<input name="address1" id="PolarisTextField2" autocomplete="shipping address-line1" class="Polaris-TextField__Input" type="text" aria-describedby="PolarisTextField2HelpText" aria-labelledby="PolarisTextField2Label" aria-invalid="false" value="">
										<div class="Polaris-TextField__Backdrop">
										</div>
										</div>
									</div>
								</div>
								<div class="Polaris-Labelled__HelpText" id="PolarisTextField2HelpText">
									<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular Polaris-Text--break Polaris-Text--subdued">
										<span style="color: var(--p-text-critical)">住所を入力してください</span>
									</span>
								</div>
							</div>
						</div>
						<div class="Polaris-FormLayout__Item">
							<div class="">
								<div class="Polaris-Labelled__LabelWrapper">
									<div class="Polaris-Label">
										<label id="PolarisTextField3Label" for="PolarisTextField3" class="Polaris-Label__Text">
										<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular">建物名、部屋番号など(任意)</span>
										</label>
									</div>
								</div>
								<div class="Polaris-Connected">
									<div class="Polaris-Connected__Item Polaris-Connected__Item--primary">
										<div class="Polaris-TextField">
										<input name="address2" id="PolarisTextField3" autocomplete="shipping address-line2" class="Polaris-TextField__Input" type="text" aria-describedby="PolarisTextField3HelpText" aria-labelledby="PolarisTextField3Label" aria-invalid="false" value="">
										<div class="Polaris-TextField__Backdrop">
										</div>
										</div>
									</div>
								</div>
								<div class="Polaris-Labelled__HelpText" id="PolarisTextField3HelpText">
									<span class="Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--regular Polaris-Text--break Polaris-Text--subdued">
										<span style="color: var(--p-text-critical)">建物名、部屋番号などを入力してください</span>
									</span>
								</div>
							</div>
						</div>
					</div>
				</form>
				<div class="Polaris-ButtonGroup">
					<div id="cancelButton" class="Polaris-ButtonGroup__Item">
						<button class="Polaris-Button Polaris-Button--plain" type="button">
							<span class="Polaris-Button__Content">
							<span class="Polaris-Button__Text">やめる</span>
							</span>
						</button>
					</div>
					<div id="toConfirmButton" class="Polaris-ButtonGroup__Item">
						<button style="background: #3677B2" class="Polaris-Button Polaris-Button--primary uWTUp" type="button">
							<span class="Polaris-Button__Content">
							<span class="Polaris-Button__Text">入力内容を確認する</span>
							</span>
						</button>
					</div>
				</div>
				<form>
					<input type="hidden" name="order_id" value=` + window.Shopify.checkout.order_id + `>
					<input name="city" placeholder="市区町村(必須)" required="" type="text" aria-required="true" autocomplete="shipping address-level2">
					<input name="address1" placeholder="住所(必須)" required="" type="text" aria-required="true" autocomplete="shipping address-line1">
					<input name="address2" placeholder="建物名、部屋番号など (任意)" type="text" aria-required="false" autocomplete="shipping address-line2">
				</form>
			</dialog>`,
		);		

		var inputDialog = document.getElementById('inputDialog');
		var inputForm = document.getElementById("inputForm");
		var toConfirmButton = document.getElementById("toConfirmButton");
		var cancelButton = document.getElementById("cancelButton");
		
		inputDialog
			.setAttribute("style","border: 1px solid #E6E6E6");
		cancelButton.addEventListener('click', function(){
			inputDialog.close();
		});

		inputDialog.showModal();

		var inputFormData;
		var confirmDialog;
		var submitButton;
		var backButton;

		toConfirmButton.addEventListener('click',function(){
			inputFormData = new FormData(inputForm);
			if(inputFormData.get('city').trim() == '' || inputFormData.get('address1').trim() == ''){
				return;
			}
			inputDialog.close();

			Shopify.Checkout.OrderStatus.addContentBox(
				'<dialog id="confirmDialog"><p>'+inputFormData.get('city')+inputFormData.get('address1')+'</p><button id="submitButton" type="button">送信</button><button id="backButton" type="button">戻る</button></dialog>'
			);
			submitButton = document.getElementById("submitButton");
			backButton = document.getElementById("backButton");

			submitButton.addEventListener('click', function(){
				var sendChangeRequest = new XMLHttpRequest();

				sendChangeRequest.addEventListener('load', (event) => {
					confirmDialog.close();
					location.reload();
				});

				sendChangeRequest.addEventListener('error', (event) => {
					alert("error");
				});

				const sendToChangeUrl = 'https://luckyvillages-sample.myshopify.com/apps/address/change_address?' + 'city=' + inputFormData.get('city') + '&address1=' + inputFormData.get('address1') + '&address2=' + inputFormData.get('address2') + '&order_id=' + inputFormData.get('order_id');

				sendChangeRequest.open('GET',sendToChangeUrl);
				sendChangeRequest.send(inputFormData);
			});

			backButton.addEventListener('click', function() {
				confirmDialog.close();
				inputDialog.showModal();

			});

			confirmDialog = document.getElementById("confirmDialog");
			confirmDialog.showModal();
		});

	}
}
