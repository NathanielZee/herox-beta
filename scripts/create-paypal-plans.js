// scripts/create-paypal-plans.js
// Run this once to create your subscription plans

require('dotenv').config({ path: '.env.local' });

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'; // Sandbox URL

// Function to get PayPal access token
async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not found in environment variables');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Function to create a product
async function createProduct(accessToken) {
  const productData = {
    name: 'Herox Premium Subscription',
    description: 'Premium access to Herox features including unlimited downloads, HD quality, and exclusive content',
    type: 'SERVICE',
    category: 'SOFTWARE'
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create product: ${error}`);
  }
  
  return response.json();
}

// Function to create a subscription plan
async function createPlan(accessToken, productId, planConfig) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(planConfig)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create plan: ${error}`);
  }
  
  return response.json();
}

// Main function to create all subscription plans
async function createAllSubscriptionPlans() {
  try {
    console.log('🚀 Starting PayPal subscription plan creation...');
    
    // Step 1: Get access token
    console.log('📝 Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();
    console.log('✅ Access token obtained');
    
    // Step 2: Create product
    console.log('📦 Creating product...');
    const product = await createProduct(accessToken);
    console.log('✅ Product created:', product.name, '| ID:', product.id);
    
    // Step 3: Create plans
    const plans = {};

    // Weekly Plan
    console.log('📅 Creating weekly plan...');
    plans.weekly = await createPlan(accessToken, product.id, {
      product_id: product.id,
      name: 'Premium Weekly',
      description: 'Weekly premium subscription with unlimited downloads and HD quality',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: {
          interval_unit: 'WEEK',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // 0 means infinite
        pricing_scheme: {
          fixed_price: {
            value: '2.99',
            currency_code: 'USD'
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    });
    console.log('✅ Weekly plan created | ID:', plans.weekly.id);

    // Monthly Plan  
    console.log('📅 Creating monthly plan...');
    plans.monthly = await createPlan(accessToken, product.id, {
      product_id: product.id,
      name: 'Premium Monthly',
      description: 'Monthly premium subscription with all features including 4K quality',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: {
          interval_unit: 'MONTH',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: '4.99',
            currency_code: 'USD'
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    });
    console.log('✅ Monthly plan created | ID:', plans.monthly.id);

    // Yearly Plan
    console.log('📅 Creating yearly plan...');
    plans.yearly = await createPlan(accessToken, product.id, {
      product_id: product.id,
      name: 'Premium Yearly',
      description: 'Yearly premium subscription with all features and exclusive content',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: {
          interval_unit: 'YEAR',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: '49.99',
            currency_code: 'USD'
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    });
    console.log('✅ Yearly plan created | ID:', plans.yearly.id);
    
    // Summary
    console.log('\n🎉 All subscription plans created successfully!');
    console.log('\n📋 PLAN IDs (save these for your app):');
    console.log('Weekly Plan ID:', plans.weekly.id);
    console.log('Monthly Plan ID:', plans.monthly.id);
    console.log('Yearly Plan ID:', plans.yearly.id);
    
    console.log('\n📝 Add these to your .env.local:');
    console.log(`NEXT_PUBLIC_PAYPAL_WEEKLY_PLAN_ID=${plans.weekly.id}`);
    console.log(`NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID=${plans.monthly.id}`);
    console.log(`NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID=${plans.yearly.id}`);

    return {
      product,
      plans
    };
    
  } catch (error) {
    console.error('❌ Error creating subscription plans:', error);
    throw error;
  }
}

// Run the script
createAllSubscriptionPlans()
  .then(() => {
    console.log('\n✨ Setup complete! You can now integrate the subscription buttons.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });