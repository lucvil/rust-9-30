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
			'<dialog id="inputDialog"><form id="inputForm"><input type="hidden" name="order_id" value=' + window.Shopify.checkout.order_id + '><input name="city" placeholder="市区町村(必須)" required="" type="text" aria-required="true" autocomplete="shipping address-level2"><input name="address1" placeholder="住所(必須)" required="" type="text" aria-required="true" autocomplete="shipping address-line1"><input name="address2" placeholder="建物名、部屋番号など (任意)" type="text" aria-required="false" autocomplete="shipping address-line2"></form><button id="toConfirmButton" type="button">確認</button><button id="cancelButton" type="button">やめる</button></dialog>',
		);		

		var inputDialog = document.getElementById('inputDialog');
		var inputForm = document.getElementById("inputForm");
		var toConfirmButton = document.getElementById("toConfirmButton");
		var cancelButton = document.getElementById("cancelButton");
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
