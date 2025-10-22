"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, ExternalLink, ShieldCheck, CreditCard, Code } from "lucide-react";
import Link from "next/link";

export default function ApiKeyGuidePage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link 
          href="/settings" 
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to Settings
        </Link>
      </div>

      <Card className="border-4 border-purple-200 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 border-b-4 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
              <Key className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                OpenAI API Key Guide
              </CardTitle>
              <p className="text-gray-600 mt-1">Everything you need to know about getting and using your API key</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* What is an API Key */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">What is an API Key?</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              An API key is like a password that allows this app to use OpenAI&apos;s AI services (like GPT-4) 
              on your behalf. It&apos;s required for AI-powered features like automatic thought analysis, 
              brainstorming, and intelligent suggestions.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Your Privacy:</strong> Your API key is stored locally in your browser and never 
                sent to our servers. All AI requests go directly from your browser to OpenAI.
              </p>
            </div>
          </section>

          {/* How to Get Your API Key */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">How to Get Your API Key</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border-2 border-gray-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Step-by-Step Instructions:</h3>
                <ol className="space-y-4">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Visit OpenAI Platform</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Go to{" "}
                        <a 
                          href="https://platform.openai.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                        >
                          platform.openai.com/api-keys
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Sign In or Create Account</p>
                      <p className="text-gray-600 text-sm mt-1">
                        If you don&apos;t have an OpenAI account, you&apos;ll need to create one. 
                        You may need to verify your email and phone number.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Create New Secret Key</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Click the <strong>&quot;Create new secret key&quot;</strong> button. 
                        Give it a name (e.g., &quot;Personal Notebook App&quot;) to help you remember what it&apos;s for.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      4
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Copy Your Key</p>
                      <p className="text-gray-600 text-sm mt-1">
                        <strong className="text-red-600">Important:</strong> Copy the key immediately! 
                        You won&apos;t be able to see it again. It should start with <code className="bg-gray-100 px-1 py-0.5 rounded">sk-</code>
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      5
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Paste in Settings</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Return to the{" "}
                        <Link href="/settings" className="text-purple-600 hover:text-purple-700 underline">
                          Settings page
                        </Link>
                        {" "}and paste your key in the API Key field, then click Save.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Pricing Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Pricing & Usage</h2>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
              <h3 className="font-bold text-yellow-900 mb-2">💰 Pay-as-you-go</h3>
              <p className="text-yellow-800 text-sm mb-3">
                OpenAI charges based on usage. You pay only for what you use, and you can set spending limits.
              </p>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span><strong>Typical cost:</strong> $0.01 - $0.10 per thought analysis (using GPT-4)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span><strong>Free credit:</strong> New accounts often get $5-$18 in free credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span><strong>Set limits:</strong> You can set monthly spending limits in your OpenAI account</span>
                </li>
              </ul>
              <a 
                href="https://openai.com/api/pricing/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-700 hover:text-yellow-900 underline text-sm mt-3 inline-flex items-center gap-1"
              >
                View detailed pricing
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Security Best Practices */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Security Best Practices</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>DO:</strong> Keep your API key private and secure</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>DO:</strong> Set spending limits in your OpenAI dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>DO:</strong> Regenerate your key if you accidentally expose it</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>DON&apos;T:</strong> Share your API key with anyone</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span><strong>DON&apos;T:</strong> Commit your key to Git or post it publicly</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Common Issues</h2>
            
            <div className="space-y-3">
              <details className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-800 cursor-pointer">
                  My key doesn&apos;t start with &quot;sk-&quot;
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Make sure you&apos;re creating a <strong>Secret Key</strong> (not a Project Key or Organization Key). 
                  Secret keys always start with &quot;sk-&quot;.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-800 cursor-pointer">
                  I get an error when using the API
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Check that: (1) Your key is correct, (2) You have credits/payment method set up in OpenAI, 
                  (3) You haven&apos;t exceeded your usage limits. Visit your{" "}
                  <a 
                    href="https://platform.openai.com/usage" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI usage dashboard
                  </a>{" "}
                  to check.
                </p>
              </details>

              <details className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-800 cursor-pointer">
                  How do I delete or regenerate my key?
                </summary>
                <p className="text-sm text-gray-600 mt-2">
                  Go to{" "}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/api-keys
                  </a>, find your key in the list, and click the delete/revoke button. 
                  Then create a new key following the steps above.
                </p>
              </details>
            </div>
          </section>

          {/* Back to Settings */}
          <div className="pt-6 border-t-2 border-gray-200">
            <Link 
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              Return to Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
